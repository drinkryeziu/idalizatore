import type { IncomingMessage, ServerResponse } from 'node:http';
import { filePrompt, reportPrompt } from './ai/prompts';
import { parseFiled, parseReport } from './ai/parse';
import { complete } from './claude';
import { transcribe } from './transcribe';
import { rateLimit } from './limits';
import { rpc, userFromToken } from './supabase';

const send = (res: ServerResponse, status: number, body: unknown) => { res.writeHead(status, { 'content-type': 'application/json' }); res.end(JSON.stringify(body)); };
const fail = (status: number, message: string) => Object.assign(new Error(message), { status });

async function readJson(req: IncomingMessage, maxBytes = 4_000_000): Promise<any> {
  const pre = (req as any).body; // some hosts parse the body before the handler runs
  if (pre !== undefined && pre !== null && typeof pre === 'object' && !Buffer.isBuffer(pre)) return pre;
  let n = 0; const chunks: Buffer[] = [];
  for await (const c of req) { n += c.length; if (n > maxBytes) throw fail(413, 'Request too large'); chunks.push(c as Buffer); }
  try { return JSON.parse(Buffer.concat(chunks).toString() || '{}'); } catch { throw fail(400, 'Invalid JSON'); }
}
/** Browsers on another origin (the web app) need CORS. Auth is a bearer token, not cookies, so "*" is safe; set ALLOWED_ORIGINS to tighten it. */
function cors(req: IncomingMessage, res: ServerResponse) {
  const allowed = (process.env.ALLOWED_ORIGINS || '*').split(',').map((o) => o.trim());
  const origin = String(req.headers.origin || '');
  if (allowed.includes('*')) res.setHeader('access-control-allow-origin', '*');
  else if (origin && allowed.includes(origin)) { res.setHeader('access-control-allow-origin', origin); res.setHeader('vary', 'origin'); }
  res.setHeader('access-control-allow-headers', 'authorization, content-type');
  res.setHeader('access-control-allow-methods', 'GET, POST, OPTIONS');
  res.setHeader('access-control-max-age', '600');
}
const requireVerified = () => process.env.REQUIRE_VERIFIED !== '0';

/** One handler for local dev (index.ts) and for Vercel (api/index.ts). Accounts and sync live in Supabase, not here. */
export async function handler(req: IncomingMessage, res: ServerResponse) {
  const t0 = Date.now();
  cors(req, res);
  if (req.method === 'OPTIONS') { res.writeHead(204); return res.end(); }
  const path = new URL(req.url || '/', 'http://x').pathname.replace(/^\/api(?=\/|$)/, '') || '/';
  try {
    if (req.method === 'GET' && (path === '/health' || path === '/')) return send(res, 200, { ok: true });
    if (req.method !== 'POST' || !['/file', '/analyze', '/transcribe'].includes(path)) throw fail(404, 'Not found');

    const token = (req.headers.authorization || '').replace(/^Bearer\s+/i, '').trim();
    const user = await userFromToken(token);
    if (!user) throw fail(401, 'Sign in required.');
    if (!rateLimit(user.id)) throw fail(429, 'Too many requests. Wait a minute.');
    if (requireVerified() && !user.confirmed) throw fail(403, 'Confirm your email first. Check your inbox.');
    const body = await readJson(req);

    if (path === '/transcribe') {
      const b64 = String(body.audio ?? '');
      if (!b64) throw fail(400, 'No audio.');
      return send(res, 200, { text: await transcribe(Buffer.from(b64, 'base64'), String(body.mimeType || 'audio/m4a')) });
    }

    if (path === '/file') {
      const raw = String(body.transcript ?? '').slice(0, 20_000);
      if (!raw.trim()) throw fail(400, 'Empty recording.');
      const ideas = (Array.isArray(body.ideas) ? body.ideas : []).slice(0, 200).map((i: any) => ({ id: String(i.id), title: String(i.title ?? ''), transcript: String(i.summary ?? i.transcript ?? '') }));
      const target = body.targetId ? String(body.targetId) : undefined;
      const out = parseFiled(await complete(filePrompt(raw, ideas, target)), ideas.map((i: any) => i.id));
      return send(res, 200, target ? { ...out, decision: 'existing', candidates: [target] } : out);
    }

    // /analyze: the monthly plan limit is checked and counted in the database
    const text = String(body.text ?? '').slice(0, 30_000);
    if (!text.trim()) throw fail(400, 'Empty idea.');
    const status = await rpc<{ used: number; limit: number | null; allowed: boolean }>(token, 'idealizator_analysis_status');
    if (!status?.allowed) return send(res, 402, { error: 'Monthly analysis limit reached.', limit: status?.limit ?? null });
    const images = (Array.isArray(body.images) ? body.images : []).slice(0, 4).map((i: any) => ({ mediaType: String(i.mediaType), data: String(i.data) }));
    const report = parseReport(await complete(reportPrompt(text, images.length), { images, maxTokens: 6000 }));
    await rpc(token, 'idealizator_count_analysis').catch(() => {}); // the report was already paid for; do not fail the request over bookkeeping
    return send(res, 200, report);
  } catch (e: any) {
    const status = e?.status ?? (e?.code === 'bad_output' ? 502 : 500);
    console.error(`[${req.method} ${path}] ${status} ${e?.message}`);
    send(res, status, { error: status === 500 ? 'Server error.' : e.message });
  } finally { console.log(`${req.method} ${path} ${res.statusCode} ${Date.now() - t0}ms`); }
}
