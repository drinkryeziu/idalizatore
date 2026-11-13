process.env.SUPABASE_URL = 'https://example.supabase.co';
process.env.SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_test';
process.env.ANTHROPIC_API_KEY = 'test';
process.env.OPENAI_API_KEY = 'test';
process.env.REQUIRE_VERIFIED = '1';

import test from 'node:test';
import assert from 'node:assert/strict';
import { AddressInfo } from 'node:net';
import { server } from './index';
import { rateLimit } from './limits';

const REPORT = { language: 'en', languageName: 'English', caption: 'The forecasted success rate.', title: 'Roof App', score: 62, verdict: 'Promising, with risks',
  factors: [{ label: 'Demand', score: 70 }], chart: null, similar: null, equipment: null,
  sections: [{ title: 'Concept', blocks: [{ kind: 'paragraph', text: 'Hello.' }] }] };

// ---- a fake Supabase + AI world. Tokens: "ok-<n>" = confirmed user n, "new-<n>" = unconfirmed, anything else = invalid ----
const used = new Map<string, number>();   // analyses counted per user
const counted: string[] = [];
let anthropicText = '';
let plan: 'free' | 'pro' = 'free';
const realFetch = globalThis.fetch;
globalThis.fetch = (async (input: any, init: any) => {
  const url = String(input);
  if (url.includes('127.0.0.1')) return realFetch(input, init);
  const auth: string = init?.headers?.authorization || init?.headers?.Authorization || '';
  const token = auth.replace('Bearer ', '');
  const json = (b: unknown, status = 200) => new Response(JSON.stringify(b), { status, headers: { 'content-type': 'application/json' } });
  if (url.includes('/auth/v1/user')) {
    const m = /^(ok|new)-(\d+)$/.exec(token);
    if (!m) return json({ msg: 'invalid' }, 401);
    return json({ id: `user-${m[2]}`, email: `u${m[2]}@example.com`, email_confirmed_at: m[1] === 'ok' ? '2026-01-01T00:00:00Z' : null, user_metadata: { name: 'Alex' } });
  }
  if (url.endsWith('/rpc/idealizator_analysis_status')) {
    const id = `user-${token.split('-')[1]}`, n = used.get(id) ?? 0, lim = plan === 'pro' ? null : 3;
    return json({ used: n, limit: lim, allowed: lim === null || n < lim });
  }
  if (url.endsWith('/rpc/idealizator_count_analysis')) { const id = `user-${token.split('-')[1]}`; used.set(id, (used.get(id) ?? 0) + 1); counted.push(id); return new Response('', { status: 204 }); }
  if (url.includes('anthropic.com')) return json({ content: [{ type: 'text', text: anthropicText }] });
  if (url.includes('openai.com')) return json({ text: ' hello roof ' });
  throw new Error('unexpected fetch ' + url);
}) as typeof fetch;

async function call(method: string, path: string, body?: unknown, token?: string) {
  if (!server.listening) await new Promise<void>((r) => server.listen(0, r));
  const port = (server.address() as AddressInfo).port;
  const res = await fetch(`http://127.0.0.1:${port}${path}`, { method, headers: { 'content-type': 'application/json', ...(token ? { authorization: `Bearer ${token}` } : {}) }, body: body === undefined ? undefined : JSON.stringify(body) });
  return { status: res.status, json: (await res.json()) as any };
}

test('health needs no sign-in; unknown routes are 404', async () => {
  assert.equal((await call('GET', '/health')).status, 200);
  assert.equal((await call('GET', '/api/health')).status, 200); // Vercel prefixes /api
  assert.equal((await call('POST', '/nope', {}, 'ok-1')).status, 404);
});

test('rejects missing or invalid Supabase token', async () => {
  assert.equal((await call('POST', '/analyze', { text: 'x' })).status, 401);
  assert.equal((await call('POST', '/analyze', { text: 'x' }, 'garbage')).status, 401);
});

test('unconfirmed email cannot use AI', async () => {
  assert.equal((await call('POST', '/analyze', { text: 'idea' }, 'new-2')).status, 403);
});

test('/analyze parses fenced JSON, counts usage, and stops at the free limit', async () => {
  anthropicText = 'Here:\n```json\n' + JSON.stringify(REPORT) + '\n```';
  const statuses: number[] = [];
  for (let i = 0; i < 4; i++) {
    const r = await call('POST', '/analyze', { text: 'A roofing app' }, 'ok-3');
    statuses.push(r.status);
    if (i === 0) assert.equal(r.json.score, 62);
  }
  assert.deepEqual(statuses, [200, 200, 200, 402]);
  assert.equal(counted.filter((c) => c === 'user-3').length, 3); // the refused call is not counted
});

test('pro plan has no limit', async () => {
  plan = 'pro';
  anthropicText = JSON.stringify(REPORT);
  for (let i = 0; i < 5; i++) assert.equal((await call('POST', '/analyze', { text: 'idea' }, 'ok-4')).status, 200);
  plan = 'free';
});

test('a bad AI answer is a 502, not counted', async () => {
  anthropicText = 'sorry, no JSON here';
  const before = counted.length;
  assert.equal((await call('POST', '/analyze', { text: 'idea' }, 'ok-5')).status, 502);
  assert.equal(counted.length, before);
});

test('/file keeps only real candidate ids', async () => {
  anthropicText = '{"text":"Clean.","decision":"unsure","candidates":["a","zzz"],"title":"T"}';
  const r = await call('POST', '/file', { transcript: 'um roof', ideas: [{ id: 'a', title: 'Roof', summary: 'x' }] }, 'ok-6');
  assert.deepEqual(r.json.candidates, ['a']);
  assert.equal(r.json.decision, 'unsure');
});

test('/transcribe returns text from the provider', async () => {
  const r = await call('POST', '/transcribe', { audio: Buffer.from('abc').toString('base64'), mimeType: 'audio/m4a' }, 'ok-7');
  assert.equal(r.json.text, 'hello roof');
});

test('rate limit blocks after max', () => {
  assert.equal(rateLimit('rl', 2, 1000, 0), true);
  assert.equal(rateLimit('rl', 2, 1000, 1), true);
  assert.equal(rateLimit('rl', 2, 1000, 2), false);
  assert.equal(rateLimit('rl', 2, 1000, 2000), true);
});

test.after(() => server.close());
