import * as Linking from 'expo-linking';
import type { User as SbUser } from '@supabase/supabase-js';
import type { Filed, Idea, Report } from './ai/types';
import { StorageChoice, User, useApp } from './store';
import { deleteAllImageFiles, imagePayloads } from './images';
import { supabase } from './supabase';

// Our own server (AI only). Set EXPO_PUBLIC_API_URL to your computer's Wi-Fi address on a real phone, or to the deployed URL.
const BASE = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:8787';

export class ApiError extends Error { constructor(msg: string, public status = 0) { super(msg); } }

// ---------- session ----------
let signedInCache = false;
export const hasSession = () => signedInCache;

/** Call once at start: reads the Keychain session and keeps the cache and the store in step with Supabase. */
export async function initSession(): Promise<void> {
  const { data } = await supabase.auth.getSession();
  signedInCache = !!data.session;
  supabase.auth.onAuthStateChange((event, session) => {
    signedInCache = !!session;
    // Only set plain state in here (no awaiting Supabase calls), as the Supabase docs require.
    if (event === 'SIGNED_OUT') useApp.getState().signedOut();
  });
}

async function accessToken() { return (await supabase.auth.getSession()).data.session?.access_token ?? null; }

const FRIENDLY: [RegExp, string][] = [
  [/invalid login credentials/i, 'Email or password is incorrect.'],
  [/email not confirmed/i, 'Confirm your email first. Check your inbox.'],
  [/rate limit|too many/i, 'Too many attempts. Try again in a few minutes.'],
  [/password should be|weak/i, 'Choose a stronger password (8+ characters with a number).'],
  [/same password|different from the old/i, 'Choose a password you have not used before.'],
  [/network|fetch/i, 'Cannot reach the server. Check your connection.'],
];
const friendly = (m: string) => FRIENDLY.find(([re]) => re.test(m))?.[1] ?? m;
const redirectTo = () => Linking.createURL('auth');

// ---------- accounts (Supabase Auth) ----------
async function finishSignIn(u: SbUser): Promise<void> {
  const { data } = await supabase.rpc('idealizator_ensure_profile'); // creates this app's profile on first use
  const p = (data ?? {}) as { name?: string; storage?: StorageChoice };
  const user: User = {
    id: u.id, email: u.email ?? '', verified: !!u.email_confirmed_at,
    name: p.name || (u.user_metadata?.name as string) || (u.email ?? '').split('@')[0],
    storage: p.storage ?? 'both',
  };
  signedInCache = true;
  useApp.getState().setSession(user);
}

/** Returns "confirm" when the person must open the email link before signing in. */
export async function register(name: string, email: string, password: string, storage: StorageChoice): Promise<'signed-in' | 'confirm'> {
  const { data, error } = await supabase.auth.signUp({ email, password, options: { data: { name, storage }, emailRedirectTo: redirectTo() } });
  if (error) throw new ApiError(friendly(error.message));
  // With email confirmation on, an address that already has an account comes back with no identities and no error.
  if (data.user && data.user.identities?.length === 0) throw new ApiError('An account with this email already exists. Sign in instead.', 409);
  if (!data.session || !data.user) return 'confirm';
  await finishSignIn(data.user);
  return 'signed-in';
}
export async function login(email: string, password: string): Promise<void> {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error || !data.user) throw new ApiError(friendly(error?.message ?? 'Sign in failed.'), 401);
  await finishSignIn(data.user);
}
export async function logout(): Promise<void> {
  await supabase.auth.signOut().catch(() => {});
  signedInCache = false;
  useApp.getState().signedOut();
  if (!useApp.getState().ideas.length) await deleteAllImageFiles(); // synced ideas were cleared from the phone, so their images go too
}
export async function forgotPassword(email: string): Promise<void> {
  const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: redirectTo() });
  if (error && !/not found/i.test(error.message)) throw new ApiError(friendly(error.message)); // never reveal whether the email has an account
}
/** After the person opens the reset link (a temporary session), set the new password and finish signing in. */
export async function setNewPassword(password: string): Promise<void> {
  const { data, error } = await supabase.auth.updateUser({ password });
  if (error || !data.user) throw new ApiError(friendly(error?.message ?? 'Could not change the password.'));
  useApp.getState().setRecovery(false);
  await finishSignIn(data.user);
}
async function confirmPassword(password: string): Promise<void> {
  const email = useApp.getState().user?.email ?? '';
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw new ApiError('Current password is incorrect.', 403);
}
export async function changePassword(currentPassword: string, newPassword: string): Promise<void> {
  await confirmPassword(currentPassword);
  const { error } = await supabase.auth.updateUser({ password: newPassword });
  if (error) throw new ApiError(friendly(error.message));
}
export async function resendVerification(): Promise<void> {
  const email = useApp.getState().user?.email ?? '';
  const { error } = await supabase.auth.resend({ type: 'signup', email, options: { emailRedirectTo: redirectTo() } });
  if (error) throw new ApiError(friendly(error.message));
}
/** Removes Idealizator's data (profile, ideas, usage) and this phone's copy. The login itself belongs to the shared Supabase project and stays. */
export async function deleteAccount(password: string): Promise<void> {
  await confirmPassword(password);
  const { error } = await supabase.rpc('idealizator_delete_my_data');
  if (error) throw new ApiError('Could not delete your data. Try again.');
  await supabase.auth.signOut().catch(() => {});
  signedInCache = false;
  useApp.getState().wipeAll();
  await deleteAllImageFiles();
}
export async function refreshMe(): Promise<void> {
  const { data } = await supabase.auth.getUser();
  if (data.user) useApp.getState().patchUser({ verified: !!data.user.email_confirmed_at });
}
export async function saveStorageChoice(storage: StorageChoice): Promise<void> {
  const u = useApp.getState().user;
  useApp.getState().patchUser({ storage });
  if (u) await supabase.from('idealizator_profiles').update({ storage }).eq('id', u.id); // the local choice already applies; this keeps the server copy
}

/** Handles the link from a confirmation or password-reset email (opened in the app through the idealizator:// scheme). */
export async function handleAuthUrl(url: string): Promise<'recovery' | 'signup' | null> {
  const p = new URLSearchParams(url.includes('#') ? url.split('#')[1] : url.split('?')[1] ?? '');
  const at = p.get('access_token'), rt = p.get('refresh_token');
  if (!at || !rt) return null;
  const { data, error } = await supabase.auth.setSession({ access_token: at, refresh_token: rt });
  if (error || !data.session) return null;
  if (p.get('type') === 'recovery') { useApp.getState().setRecovery(true); return 'recovery'; }
  await finishSignIn(data.session.user);
  return 'signup';
}

// ---------- our server: AI only ----------
async function post<T>(path: string, body: unknown): Promise<T> {
  const token = await accessToken();
  let res: Response;
  try {
    res = await fetch(BASE + path, {
      method: 'POST', signal: AbortSignal.timeout(90_000),
      headers: { 'content-type': 'application/json', ...(token ? { authorization: `Bearer ${token}` } : {}) }, body: JSON.stringify(body),
    });
  } catch { throw new ApiError('Cannot reach the server. Check your connection.'); }
  const j: any = await res.json().catch(() => ({}));
  if (!res.ok) throw new ApiError(j.error || `Server error (${res.status}).`, res.status);
  return j as T;
}

export const fileRecording = (transcript: string, ideas: Idea[], targetId?: string) =>
  post<Filed>('/file', { transcript, targetId, ideas: ideas.map((i) => ({ id: i.id, title: i.title, summary: i.transcript.replace(/\s+/g, ' ').slice(0, 320) })) });
export const analyzeIdea = async (idea: Idea) => post<Report>('/analyze', { text: idea.transcript, images: await imagePayloads(idea.images) });
export const transcribeAudio = (audioBase64: string, mimeType: string) => post<{ text: string }>('/transcribe', { audio: audioBase64, mimeType });

// ---------- sync (Supabase function, last write wins; see supabase/migrations) ----------
export async function syncRequest(since: string, ideas: Idea[], deleted: string[]) {
  const { data, error } = await supabase.rpc('idealizator_sync', { p_since: since || null, p_ideas: ideas, p_deleted: deleted });
  if (error) throw new ApiError(error.message);
  return data as { serverTime: string; ideas: Idea[]; deleted: string[] };
}
