import { createHash, randomBytes, scrypt, timingSafeEqual, randomUUID } from 'node:crypto';
import { db } from './db.ts';

const sha = (s: string) => createHash('sha256').update(s).digest('hex');
const now = () => new Date().toISOString();
const inMs = (ms: number) => new Date(Date.now() + ms).toISOString();

// scrypt (memory-hard, built into Node). Stored as scrypt$N$salt$hash
const N = 32768;
const derive = (pw: string, salt: Buffer, n = N) => new Promise<Buffer>((res, rej) =>
  scrypt(pw.normalize('NFKC'), salt, 64, { N: n, r: 8, p: 1, maxmem: 128 * 1024 * 1024 }, (e, k) => (e ? rej(e) : res(k))));

export async function hashPassword(pw: string) {
  const salt = randomBytes(16);
  return `scrypt$${N}$${salt.toString('base64')}$${(await derive(pw, salt)).toString('base64')}`;
}
export async function verifyPassword(pw: string, stored: string) {
  const [, n, salt, hash] = stored.split('$');
  const want = Buffer.from(hash, 'base64');
  const got = await derive(pw, Buffer.from(salt, 'base64'), Number(n));
  return got.length === want.length && timingSafeEqual(got, want);
}

export const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export function passwordProblem(pw: string): string | null {
  if (pw.length < 8) return 'Use at least 8 characters.';
  if (pw.length > 200) return 'Password is too long.';
  if (!/\d/.test(pw)) return 'Include at least one number.';
  return null;
}

export type UserRow = { id: string; name: string; email: string; pw_hash: string; verified: number; storage: string; created_at: string };
export const publicUser = (u: UserRow) => ({ id: u.id, name: u.name, email: u.email, verified: !!u.verified, storage: u.storage });
export const userByEmail = (email: string) => db.prepare('SELECT * FROM users WHERE email = ?').get(email.trim().toLowerCase()) as UserRow | undefined;
export const userById = (id: string) => db.prepare('SELECT * FROM users WHERE id = ?').get(id) as UserRow | undefined;

export async function createUser(name: string, email: string, password: string, storage: string): Promise<UserRow> {
  const id = randomUUID();
  db.prepare('INSERT INTO users (id,name,email,pw_hash,verified,storage,created_at) VALUES (?,?,?,?,0,?,?)')
    .run(id, name.trim().slice(0, 60), email.trim().toLowerCase(), await hashPassword(password), storage, now());
  return userById(id)!;
}

export function createSession(userId: string): string {
  const token = randomBytes(32).toString('base64url');
  db.prepare('INSERT INTO sessions (token_hash,user_id,created_at,expires_at) VALUES (?,?,?,?)').run(sha(token), userId, now(), inMs(30 * 86400_000));
  return token;
}
export function sessionUser(token: string): UserRow | undefined {
  if (!token) return undefined;
  const s = db.prepare('SELECT user_id, expires_at FROM sessions WHERE token_hash = ?').get(sha(token)) as any;
  if (!s) return undefined;
  if (s.expires_at < now()) { db.prepare('DELETE FROM sessions WHERE token_hash = ?').run(sha(token)); return undefined; }
  return userById(s.user_id);
}
export const endSession = (token: string) => void db.prepare('DELETE FROM sessions WHERE token_hash = ?').run(sha(token));
export const endOtherSessions = (userId: string, keep: string) => void db.prepare('DELETE FROM sessions WHERE user_id = ? AND token_hash <> ?').run(userId, sha(keep));
export const endAllSessions = (userId: string) => void db.prepare('DELETE FROM sessions WHERE user_id = ?').run(userId);

/** One-time tokens: 'verify' (long, in an emailed link) and 'reset' (short code the person types in the app). */
export function createToken(userId: string, kind: 'verify' | 'reset'): string {
  db.prepare('DELETE FROM tokens WHERE user_id = ? AND kind = ?').run(userId, kind);
  const raw = kind === 'reset'
    ? Array.from(randomBytes(8), (b) => 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'[b % 32]).join('')
    : randomBytes(32).toString('base64url');
  db.prepare('INSERT INTO tokens (token_hash,user_id,kind,expires_at) VALUES (?,?,?,?)').run(sha(raw), userId, kind, inMs(kind === 'reset' ? 30 * 60_000 : 24 * 3600_000));
  return raw;
}
/** Returns the user id and deletes the token, or null when unknown, expired or for another user. */
export function consumeToken(raw: string, kind: 'verify' | 'reset', userId?: string): string | null {
  const code = raw.trim();
  const t = db.prepare('SELECT user_id, expires_at FROM tokens WHERE token_hash = ? AND kind = ?').get(sha(code), kind) as any;
  if (!t || t.expires_at < now() || (userId && t.user_id !== userId)) return null;
  db.prepare('DELETE FROM tokens WHERE token_hash = ?').run(sha(code));
  return t.user_id;
}
