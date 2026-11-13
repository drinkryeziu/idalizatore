import { createServer, IncomingMessage, ServerResponse } from 'node:http';
import { filePrompt, reportPrompt } from '../../src/ai/prompts.ts';
import { parseFiled, parseReport } from '../../src/ai/parse.ts';
import { transcribe } from './transcribe.ts';
import { complete } from './claude.ts';
import { analyzeLimitFor, analyzeUsed, countAnalyze, rateLimit } from './limits.ts';
import { db } from './db.ts';
import {
  EMAIL, UserRow, consumeToken, createSession, createToken, createUser, endAllSessions, endOtherSessions, endSession,
  hashPassword, passwordProblem, publicUser, sessionUser, userByEmail, userById, verifyPassword,
} from './auth.ts';
import { sendMail } from './mail.ts';

const send = (res: ServerResponse, status: number, body: unknown) => { res.writeHead(status, { 'content-type': 'application/json' }); res.end(JSON.stringify(body)); };
const fail = (status: number, message: string) => Object.assign(new Error(message), { status });

async function readJson(req: IncomingMessage, maxBytes = 12_000_000): Promise<any> {
  let n = 0; const chunks: Buffer[] = [];
  for await (const c of req) { n += c.length; if (n > maxBytes) throw fail(413, 'Request too large'); chunks.push(c as Buffer); }
  try { return JSON.parse(Buffer.concat(chunks).toString() || '{}'); } catch { throw fail(400, 'Invalid JSON'); }
}

const bearer = (req: IncomingMessage) => (req.headers.authorization || '').replace(/^Bearer\s+/i, '').trim();
const ip = (req: IncomingMessage) => req.socket.remoteAddress || 'unknown';
const publicBase = () => process.env.PUBLIC_URL || `http://localhost:${process.env.PORT || 8787}`;
const requireVerified = () => process.env.REQUIRE_VERIFIED !== '0';

function authed(req: IncomingMessage): { user: UserRow; token: string } {
  const token = bearer(req), user = sessionUser(token);
  if (!user) throw fail(401, 'Sign in required.');
  return { user, token };
}
// TODO(billing): load the plan from the Billing table once plans and payments exist (handoff 7).
const planOf = (_u: UserRow) => 'free' as const;

async function sendVerification(u: UserRow) {
  const link = `${publicBase()}/auth/verify?token=${createToken(u.id, 'verify')}`;
  await sendMail(u.email, 'Confirm your Idealizator email', `Hi ${u.name},\n\nConfirm your email address:\n${link}\n\nIf you did not create an account, ignore this message.`);
}

const html = (res: ServerResponse, status: number, body: string) => { res.writeHead(status, { 'content-type': 'text/html; charset=utf-8' }); res.end(`<!doctype html><meta name="viewport" content="width=device-width,initial-scale=1"><body style="font-family:-apple-system,Helvetica;text-align:center;padding:64px 24px;color:#252525"><h1 style="color:#7d0099">${body}</h1>`); };

export const server = createServer(async (req, res) => {
  const t0 = Date.now();
  const url = new URL(req.url || '/', 'http://x');
  const path = url.pathname;
  try {
    if (req.method === 'GET' && path === '/health') return send(res, 200, { ok: true });

    // Email verification link (opened from the email, so GET and HTML).
    if (req.method === 'GET' && path === '/auth/verify') {
      const id = consumeToken(url.searchParams.get('token') || '', 'verify');
      if (!id) return html(res, 400, 'This link is invalid or has expired.');
      db.prepare('UPDATE users SET verified = 1 WHERE id = ?').run(id);
      return html(res, 200, 'Email confirmed. You can go back to Idealizator.');
    }

    // ---- accounts ----
    if (req.method === 'POST' && path === '/auth/register') {
      if (!rateLimit('reg:' + ip(req), Number(process.env.REGISTER_LIMIT || 10), 3600_000)) throw fail(429, 'Too many attempts. Try again later.');
      const b = await readJson(req, 10_000);
      const name = String(b.name ?? '').trim(), email = String(b.email ?? '').trim().toLowerCase(), pw = String(b.password ?? '');
      const storage = /^(device|server|both)$/.test(b.storage) ? b.storage : 'both';
      if (!name) throw fail(400, 'Enter your name.');
      if (!EMAIL.test(email)) throw fail(400, 'Enter a valid email address.');
      const problem = passwordProblem(pw); if (problem) throw fail(400, problem);
      if (userByEmail(email)) throw fail(409, 'An account with this email already exists. Sign in instead.');
      const user = await createUser(name, email, pw, storage);
      await sendVerification(user);
      return send(res, 201, { token: createSession(user.id), user: publicUser(user) });
    }

    if (req.method === 'POST' && path === '/auth/login') {
      const b = await readJson(req, 10_000);
      const email = String(b.email ?? '').trim().toLowerCase();
      if (!rateLimit('login:' + email, 8, 15 * 60_000) || !rateLimit('loginip:' + ip(req), 30, 15 * 60_000)) throw fail(429, 'Too many attempts. Try again in a few minutes.');
      const u = userByEmail(email);
      // Same error and similar timing for unknown email and wrong password.
      const ok = u ? await verifyPassword(String(b.password ?? ''), u.pw_hash) : (await hashPassword('x'), false);
      if (!u || !ok) throw fail(401, 'Email or password is incorrect.');
      return send(res, 200, { token: createSession(u.id), user: publicUser(u) });
    }

    if (req.method === 'POST' && path === '/auth/forgot') {
      const b = await readJson(req, 10_000);
      const email = String(b.email ?? '').trim().toLowerCase();
      if (!rateLimit('forgot:' + ip(req), 10, 3600_000)) throw fail(429, 'Too many attempts. Try again later.');
      const u = userByEmail(email);
      if (u) await sendMail(u.email, 'Your Idealizator reset code', `Your password reset code is ${createToken(u.id, 'reset')}\nIt works for 30 minutes. If you did not ask for it, ignore this message.`);
      return send(res, 200, { ok: true }); // never reveals whether the email exists
    }

    if (req.method === 'POST' && path === '/auth/reset') {
      const b = await readJson(req, 10_000);
      const email = String(b.email ?? '').trim().toLowerCase(), pw = String(b.password ?? '');
      if (!rateLimit('reset:' + email, 8, 30 * 60_000)) throw fail(429, 'Too many attempts. Request a new code.');
      const problem = passwordProblem(pw); if (problem) throw fail(400, problem);
      const u = userByEmail(email);
      const id = u ? consumeToken(String(b.code ?? '').toUpperCase(), 'reset', u.id) : null;
      if (!u || !id) throw fail(400, 'That code is wrong or has expired.');
      db.prepare('UPDATE users SET pw_hash = ?, verified = 1 WHERE id = ?').run(await hashPassword(pw), u.id); // a reset code proves the inbox
      endAllSessions(u.id);
      return send(res, 200, { ok: true });
    }

    // ---- everything below needs a session ----
    if (!path.startsWith('/auth/') && !['/me', '/sync', '/file', '/analyze', '/transcribe'].includes(path)) throw fail(404, 'Not found');
    const { user, token } = authed(req);

    if (req.method === 'GET' && path === '/me') return send(res, 200, { user: publicUser(user) });

    if (req.method === 'POST' && path === '/auth/logout') { endSession(token); return send(res, 200, { ok: true }); }

    if (req.method === 'POST' && path === '/auth/resend') {
      if (!rateLimit('resend:' + user.id, 3, 3600_000)) throw fail(429, 'Too many requests. Try again later.');
      if (!user.verified) await sendVerification(user);
      return send(res, 200, { ok: true });
    }

    if (req.method === 'POST' && path === '/auth/change-password') {
      const b = await readJson(req, 10_000);
      if (!rateLimit('chpw:' + user.id, 5, 15 * 60_000)) throw fail(429, 'Too many attempts. Try again later.');
      if (!(await verifyPassword(String(b.currentPassword ?? ''), user.pw_hash))) throw fail(403, 'Current password is incorrect.');
      const problem = passwordProblem(String(b.newPassword ?? '')); if (problem) throw fail(400, problem);
      db.prepare('UPDATE users SET pw_hash = ? WHERE id = ?').run(await hashPassword(String(b.newPassword)), user.id);
      endOtherSessions(user.id, token);
      return send(res, 200, { ok: true });
    }

    if (req.method === 'POST' && path === '/auth/settings') {
      const b = await readJson(req, 10_000);
      if (/^(device|server|both)$/.test(b.storage)) db.prepare('UPDATE users SET storage = ? WHERE id = ?').run(b.storage, user.id);
      return send(res, 200, { user: publicUser(userById(user.id)!) });
    }

    // Deletes the account and all server-side data (ideas cascade). The app also wipes the phone.
    if (req.method === 'POST' && path === '/auth/delete') {
      const b = await readJson(req, 10_000);
      if (!(await verifyPassword(String(b.password ?? ''), user.pw_hash))) throw fail(403, 'Password is incorrect.');
      db.prepare('DELETE FROM users WHERE id = ?').run(user.id);
      return send(res, 200, { ok: true });
    }

    if (req.method !== 'POST') throw fail(404, 'Not found');
    if (!rateLimit(user.id)) throw fail(429, 'Too many requests. Wait a minute.');
    const body = await readJson(req);

    // ---- sync: last write wins per idea, by the idea's updatedAt (handoff 8) ----
    if (path === '/sync') {
      const incoming: any[] = Array.isArray(body.ideas) ? body.ideas.slice(0, 500) : [];
      const deleted: string[] = (Array.isArray(body.deleted) ? body.deleted : []).slice(0, 500).map(String);
      const since = typeof body.since === 'string' ? body.since : '';
      const serverNow = new Date().toISOString();
      const get = db.prepare('SELECT updated_at, deleted FROM ideas WHERE user_id = ? AND id = ?');
      const put = db.prepare('INSERT INTO ideas (user_id,id,json,updated_at,server_at,deleted) VALUES (?,?,?,?,?,0) ON CONFLICT(user_id,id) DO UPDATE SET json=excluded.json, updated_at=excluded.updated_at, server_at=excluded.server_at, deleted=0');
      db.exec('BEGIN');
      try {
        for (const i of incoming) {
          if (!i || typeof i.id !== 'string' || typeof i.updatedAt !== 'string') continue;
          const row = JSON.stringify({ ...i, images: [] }); // images are not synced yet
          if (row.length > 500_000) continue;
          const cur = get.get(user.id, i.id) as any;
          if (cur && cur.updated_at >= i.updatedAt) continue; // server copy (or its deletion) is newer
          put.run(user.id, i.id, row, i.updatedAt, serverNow);
        }
        for (const id of deleted) db.prepare('INSERT INTO ideas (user_id,id,json,updated_at,server_at,deleted) VALUES (?,?,?,?,?,1) ON CONFLICT(user_id,id) DO UPDATE SET deleted=1, server_at=excluded.server_at, updated_at=excluded.updated_at').run(user.id, id, '{}', serverNow, serverNow);
        db.exec('COMMIT');
      } catch (e) { db.exec('ROLLBACK'); throw e; }
      const rows = db.prepare('SELECT id, json, deleted FROM ideas WHERE user_id = ? AND server_at > ?').all(user.id, since) as any[];
      return send(res, 200, {
        serverTime: serverNow,
        ideas: rows.filter((r) => !r.deleted).map((r) => JSON.parse(r.json)),
        deleted: rows.filter((r) => r.deleted).map((r) => r.id),
      });
    }

    // ---- AI endpoints: need a confirmed email when REQUIRE_VERIFIED is on ----
    if (requireVerified() && !user.verified) throw fail(403, 'Confirm your email first. Check your inbox.');

    if (path === '/transcribe') {
      const b64 = String(body.audio ?? '');
      if (!b64) throw fail(400, 'No audio.');
      const text = await transcribe(Buffer.from(b64, 'base64'), String(body.mimeType || 'audio/m4a'));
      return send(res, 200, { text });
    }

    if (path === '/file') {
      const raw = String(body.transcript ?? '').slice(0, 20_000);
      if (!raw.trim()) throw fail(400, 'Empty recording.');
      const ideas = (Array.isArray(body.ideas) ? body.ideas : []).slice(0, 200).map((i: any) => ({ id: String(i.id), title: String(i.title ?? ''), transcript: String(i.summary ?? i.transcript ?? '') }));
      const target = body.targetId ? String(body.targetId) : undefined;
      const out = parseFiled(await complete(filePrompt(raw, ideas, target)), ideas.map((i: any) => i.id));
      return send(res, 200, target ? { ...out, decision: 'existing', candidates: [target] } : out);
    }

    if (path === '/analyze') {
      const text = String(body.text ?? '').slice(0, 30_000);
      if (!text.trim()) throw fail(400, 'Empty idea.');
      const limit = analyzeLimitFor(planOf(user));
      if (limit !== null && analyzeUsed(user.id) >= limit) return send(res, 402, { error: 'Monthly analysis limit reached.', limit });
      const images = (Array.isArray(body.images) ? body.images : []).slice(0, 4).map((i: any) => ({ mediaType: String(i.mediaType), data: String(i.data) }));
      const report = parseReport(await complete(reportPrompt(text, images.length), { images, maxTokens: 6000 }));
      countAnalyze(user.id);
      return send(res, 200, report);
    }
    throw fail(404, 'Not found');
  } catch (e: any) {
    const status = e?.status ?? (e?.code === 'bad_output' ? 502 : 500);
    console.error(`[${req.method} ${path}] ${status} ${e?.message}`);
    send(res, status, { error: status === 500 ? 'Server error.' : e.message });
  } finally { console.log(`${req.method} ${path} ${res.statusCode} ${Date.now() - t0}ms`); }
});

if (process.argv[1]?.endsWith('index.ts')) server.listen(Number(process.env.PORT || 8787), () => console.log('Idealizator server on', process.env.PORT || 8787));
