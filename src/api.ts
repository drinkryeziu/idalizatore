import * as SecureStore from 'expo-secure-store';
import type { Filed, Idea, Report } from './ai/types';
import { StorageChoice, User, useApp } from './store';
import { deleteAllImageFiles, imagePayloads } from './images';

// Set EXPO_PUBLIC_API_URL to the backend (on a real phone use your computer's LAN address, not localhost).
const BASE = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:8787';
const TOKEN_KEY = 'idealizator-session';

export class ApiError extends Error { constructor(msg: string, public status = 0) { super(msg); } }

// The session token lives in the iOS Keychain (SecureStore), never in AsyncStorage.
let token: string | null = null;
export async function loadToken() { try { token = await SecureStore.getItemAsync(TOKEN_KEY); } catch { token = null; } return token; }
async function saveToken(t: string | null) {
  token = t;
  try { t ? await SecureStore.setItemAsync(TOKEN_KEY, t) : await SecureStore.deleteItemAsync(TOKEN_KEY); } catch {}
}
export const hasToken = () => !!token;

async function request<T>(method: 'GET' | 'POST', path: string, body?: unknown, auth = true): Promise<T> {
  let res: Response;
  try {
    res = await fetch(BASE + path, {
      method, signal: AbortSignal.timeout(90_000),
      headers: { 'content-type': 'application/json', ...(auth && token ? { authorization: `Bearer ${token}` } : {}) },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch { throw new ApiError('Cannot reach the server. Check your connection.'); }
  const j: any = await res.json().catch(() => ({}));
  if (res.status === 401 && auth && token) { await saveToken(null); useApp.getState().signedOut(); } // session expired or revoked elsewhere
  if (!res.ok) throw new ApiError(j.error || `Server error (${res.status}).`, res.status);
  return j as T;
}
const post = <T,>(path: string, body: unknown) => request<T>('POST', path, body);

// ---- accounts ----
type Session = { token: string; user: User };
export async function register(name: string, email: string, password: string, storage: StorageChoice) {
  const s = await request<Session>('POST', '/auth/register', { name, email, password, storage }, false);
  await saveToken(s.token); useApp.getState().setSession(s.user);
}
export async function login(email: string, password: string) {
  const s = await request<Session>('POST', '/auth/login', { email, password }, false);
  await saveToken(s.token); useApp.getState().setSession(s.user);
}
export async function logout() {
  try { await request('POST', '/auth/logout', {}); } catch {}
  await saveToken(null); useApp.getState().signedOut();
  if (!useApp.getState().ideas.length) await deleteAllImageFiles(); // synced ideas were cleared from the phone, so their images go too
}
export const forgotPassword = (email: string) => request('POST', '/auth/forgot', { email }, false);
export const resetPassword = (email: string, code: string, password: string) => request('POST', '/auth/reset', { email, code, password }, false);
export const changePassword = (currentPassword: string, newPassword: string) => post('/auth/change-password', { currentPassword, newPassword });
export const resendVerification = () => post('/auth/resend', {});
export async function deleteAccount(password: string) {
  await post('/auth/delete', { password });
  await saveToken(null); useApp.getState().wipeAll(); await deleteAllImageFiles();
}
export async function refreshMe() {
  const r = await request<{ user: User }>('GET', '/me');
  useApp.getState().patchUser(r.user);
}
export async function saveStorageChoice(storage: StorageChoice) {
  useApp.getState().patchUser({ storage });
  try { await post('/auth/settings', { storage }); } catch {} // the local choice already applies; the server copy catches up on the next change
}

// ---- AI ----
export const fileRecording = (transcript: string, ideas: Idea[], targetId?: string) =>
  post<Filed>('/file', { transcript, targetId, ideas: ideas.map((i) => ({ id: i.id, title: i.title, summary: i.transcript.replace(/\s+/g, ' ').slice(0, 320) })) });
export const analyzeIdea = async (idea: Idea) => post<Report>('/analyze', { text: idea.transcript, images: await imagePayloads(idea.images) });
export const transcribeAudio = (audioBase64: string, mimeType: string) => post<{ text: string }>('/transcribe', { audio: audioBase64, mimeType });

// ---- sync ----
export const syncRequest = (since: string, ideas: Idea[], deleted: string[]) =>
  post<{ serverTime: string; ideas: Idea[]; deleted: string[] }>('/sync', { since, ideas, deleted });
