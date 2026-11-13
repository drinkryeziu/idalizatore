import test from 'node:test';
import assert from 'node:assert/strict';
import { AddressInfo } from 'node:net';
import { server } from './index.ts';
import { rateLimit } from './limits.ts';

const REPORT = { language: 'en', languageName: 'English', caption: 'The forecasted success rate.', title: 'Roof App', score: 62, verdict: 'Promising, with risks',
  factors: [{ label: 'Demand', score: 70 }], chart: null, similar: null, equipment: null,
  sections: [{ title: 'Concept', blocks: [{ kind: 'paragraph', text: 'Hello.' }] }] };

function mockClaude(text: string) {
  globalThis.fetch = (async () => new Response(JSON.stringify({ content: [{ type: 'text', text }] }), { status: 200 })) as typeof fetch;
}
async function call(path: string, body: unknown, auth = 'u1') {
  await new Promise<void>((r) => server.listening ? r() : server.listen(0, r));
  const port = (server.address() as AddressInfo).port;
  const res = await fetch(`http://127.0.0.1:${port}${path}`, { method: 'POST', headers: { authorization: `Bearer ${auth}`, 'content-type': 'application/json' }, body: JSON.stringify(body) });
  return { status: res.status, json: await res.json() as any };
}
const real = globalThis.fetch;
process.env.ANTHROPIC_API_KEY = 'test';

test('rejects missing auth', async () => {
  await new Promise<void>((r) => server.listening ? r() : server.listen(0, r));
  const port = (server.address() as AddressInfo).port;
  assert.equal((await real(`http://127.0.0.1:${port}/analyze`, { method: 'POST', body: '{}' })).status, 401);
});

test('/analyze parses fenced JSON and enforces free limit', async () => {
  const realFetch = globalThis.fetch;
  const results: number[] = [];
  for (let i = 0; i < 4; i++) {
    const port = (await (async () => { await new Promise<void>((r) => server.listening ? r() : server.listen(0, r)); return (server.address() as AddressInfo).port; })());
    const saved = globalThis.fetch;
    // Only the Anthropic call is mocked; the call to our own server uses the real fetch.
    globalThis.fetch = (async (url: any, init: any) => String(url).includes('anthropic.com')
      ? new Response(JSON.stringify({ content: [{ type: 'text', text: 'Here:\n```json\n' + JSON.stringify(REPORT) + '\n```' }] }), { status: 200 })
      : saved(url, init)) as typeof fetch;
    const res = await fetch(`http://127.0.0.1:${port}/analyze`, { method: 'POST', headers: { authorization: 'Bearer limit-user' }, body: JSON.stringify({ text: 'A roofing app' }) });
    results.push(res.status);
    if (i === 0) assert.equal(((await res.json()) as any).score, 62);
    globalThis.fetch = saved;
  }
  assert.deepEqual(results, [200, 200, 200, 402]);
  globalThis.fetch = realFetch;
});

test('/file keeps only real candidate ids', async () => {
  const saved = globalThis.fetch;
  globalThis.fetch = (async (url: any, init: any) => String(url).includes('anthropic.com')
    ? new Response(JSON.stringify({ content: [{ type: 'text', text: '{"text":"Clean.","decision":"unsure","candidates":["a","zzz"],"title":"T"}' }] }), { status: 200 })
    : saved(url, init)) as typeof fetch;
  const port = (server.address() as AddressInfo).port;
  const res = await fetch(`http://127.0.0.1:${port}/file`, { method: 'POST', headers: { authorization: 'Bearer u2' }, body: JSON.stringify({ transcript: 'um roof', ideas: [{ id: 'a', title: 'Roof', summary: 'x' }] }) });
  const j: any = await res.json();
  globalThis.fetch = saved;
  assert.deepEqual(j.candidates, ['a']);
  assert.equal(j.decision, 'unsure');
});

test('rate limit blocks after max', () => {
  assert.equal(rateLimit('rl', 2, 1000, 0), true);
  assert.equal(rateLimit('rl', 2, 1000, 1), true);
  assert.equal(rateLimit('rl', 2, 1000, 2), false);
  assert.equal(rateLimit('rl', 2, 1000, 2000), true);
});

test('/transcribe returns text from the provider', async () => {
  process.env.OPENAI_API_KEY = 'test';
  const saved = globalThis.fetch;
  globalThis.fetch = (async (url: any, init: any) => String(url).includes('openai.com')
    ? new Response(JSON.stringify({ text: ' hello roof ' }), { status: 200 })
    : saved(url, init)) as typeof fetch;
  const port = (server.address() as AddressInfo).port;
  const res = await fetch(`http://127.0.0.1:${port}/transcribe`, { method: 'POST', headers: { authorization: 'Bearer u3' }, body: JSON.stringify({ audio: Buffer.from('abc').toString('base64'), mimeType: 'audio/m4a' }) });
  const j: any = await res.json();
  globalThis.fetch = saved;
  assert.equal(j.text, 'hello roof');
});

test.after(() => server.close());
