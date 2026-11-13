import { createServer, IncomingMessage, ServerResponse } from 'node:http';
import { filePrompt, reportPrompt } from '../../src/ai/prompts.ts';
import { parseFiled, parseReport } from '../../src/ai/parse.ts';
import { complete } from './claude.ts';
import { analyzeLimitFor, analyzeUsed, countAnalyze, rateLimit } from './limits.ts';

const send = (res: ServerResponse, status: number, body: unknown) => { res.writeHead(status, { 'content-type': 'application/json' }); res.end(JSON.stringify(body)); };
async function readJson(req: IncomingMessage, maxBytes = 12_000_000): Promise<any> {
  let n = 0; const chunks: Buffer[] = [];
  for await (const c of req) { n += c.length; if (n > maxBytes) throw Object.assign(new Error('Request too large'), { status: 413 }); chunks.push(c as Buffer); }
  try { return JSON.parse(Buffer.concat(chunks).toString() || '{}'); } catch { throw Object.assign(new Error('Invalid JSON'), { status: 400 }); }
}

// TODO(auth): verify a real session token (handoff 8) and load the user's plan from billing. Until then a bearer token = user id, plan "free".
function user(req: IncomingMessage) {
  const id = (req.headers.authorization || '').replace(/^Bearer\s+/i, '').trim();
  return id ? { id, plan: 'free' as const } : null;
}

export const server = createServer(async (req, res) => {
  const t0 = Date.now();
  try {
    if (req.method === 'GET' && req.url === '/health') return send(res, 200, { ok: true });
    if (req.method !== 'POST') return send(res, 404, { error: 'Not found' });
    const u = user(req);
    if (!u) return send(res, 401, { error: 'Sign in required.' });
    if (!rateLimit(u.id)) return send(res, 429, { error: 'Too many requests. Wait a minute.' });
    const body = await readJson(req);

    if (req.url === '/file') {
      const raw = String(body.transcript ?? '').slice(0, 20_000);
      if (!raw.trim()) return send(res, 400, { error: 'Empty recording.' });
      const ideas = (Array.isArray(body.ideas) ? body.ideas : []).slice(0, 200).map((i: any) => ({ id: String(i.id), title: String(i.title ?? ''), transcript: String(i.summary ?? i.transcript ?? '') }));
      const target = body.targetId ? String(body.targetId) : undefined;
      const out = parseFiled(await complete(filePrompt(raw, ideas, target)), ideas.map((i: any) => i.id));
      return send(res, 200, target ? { ...out, decision: 'existing', candidates: [target] } : out);
    }

    if (req.url === '/analyze') {
      const text = String(body.text ?? '').slice(0, 30_000);
      if (!text.trim()) return send(res, 400, { error: 'Empty idea.' });
      const limit = analyzeLimitFor(u.plan);
      if (limit !== null && analyzeUsed(u.id) >= limit) return send(res, 402, { error: 'Monthly analysis limit reached.', limit });
      const images = (Array.isArray(body.images) ? body.images : []).slice(0, 4).map((i: any) => ({ mediaType: String(i.mediaType), data: String(i.data) }));
      const report = parseReport(await complete(reportPrompt(text, images.length), { images, maxTokens: 6000 }));
      countAnalyze(u.id);
      return send(res, 200, report);
    }
    return send(res, 404, { error: 'Not found' });
  } catch (e: any) {
    const status = e?.status ?? (e?.code === 'bad_output' ? 502 : 500);
    console.error(`[${req.method} ${req.url}] ${status} ${e?.message}`);
    send(res, status, { error: status === 500 ? 'Server error.' : e.message });
  } finally { console.log(`${req.method} ${req.url} ${res.statusCode} ${Date.now() - t0}ms`); }
});

if (process.argv[1]?.endsWith('index.ts')) server.listen(Number(process.env.PORT || 8787), () => console.log('Idealizator server on', process.env.PORT || 8787));
