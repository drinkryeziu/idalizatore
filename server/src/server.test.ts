import './testenv.ts';
import test from 'node:test';
import assert from 'node:assert/strict';
import { AddressInfo } from 'node:net';
import { server } from './index.ts';
import { outbox } from './mail.ts';
import { rateLimit } from './limits.ts';

const REPORT = { language: 'en', languageName: 'English', caption: 'The forecasted success rate.', title: 'Roof App', score: 62, verdict: 'Promising, with risks',
  factors: [{ label: 'Demand', score: 70 }], chart: null, similar: null, equipment: null,
  sections: [{ title: 'Concept', blocks: [{ kind: 'paragraph', text: 'Hello.' }] }] };

const realFetch = globalThis.fetch;
async function port() {
  if (!server.listening) await new Promise<void>((r) => server.listen(0, r));
  const p = (server.address() as AddressInfo).port;
  process.env.PUBLIC_URL = `http://127.0.0.1:${p}`; // emailed links must point at the test server
  return p;
}
async function call(method: string, path: string, body?: unknown, token?: string) {
  const res = await realFetch(`http://127.0.0.1:${await port()}${path}`, { method, headers: { 'content-type': 'application/json', ...(token ? { authorization: `Bearer ${token}` } : {}) }, body: body === undefined ? undefined : JSON.stringify(body) });
  const ct = res.headers.get('content-type') || '';
  return { status: res.status, json: (ct.includes('json') ? await res.json() : await res.text()) as any };
}
/** Mock only calls to Anthropic / OpenAI; calls to our own server pass through. */
function mockUpstream(handler: (url: string) => unknown) {
  globalThis.fetch = (async (url: any, init: any) => String(url).includes('127.0.0.1') ? realFetch(url, init) : new Response(JSON.stringify(handler(String(url))), { status: 200 })) as typeof fetch;
}
let n = 0;
async function newUser(verified = true) {
  const email = `u${++n}@example.com`;
  const r = await call('POST', '/auth/register', { name: 'Alex', email, password: 'Secret123', storage: 'both' });
  assert.equal(r.status, 201);
  if (verified) { // use the emailed link, like a real person
    const link = outbox.filter((m) => m.to === email).at(-1)!.text.match(/http\S+/)![0];
    assert.equal((await realFetch(link)).status, 200);
  }
  return { email, token: r.json.token as string };
}

test('rejects missing or bad session', async () => {
  assert.equal((await call('POST', '/analyze', { text: 'x' })).status, 401);
  assert.equal((await call('POST', '/analyze', { text: 'x' }, 'nope')).status, 401);
});

test('register, login, me, logout', async () => {
  const { email, token } = await newUser();
  assert.equal((await call('POST', '/auth/register', { name: 'A', email, password: 'Secret123' })).status, 409);
  assert.equal((await call('POST', '/auth/register', { name: 'A', email: 'b@example.com', password: 'short' })).status, 400);
  const bad = await call('POST', '/auth/login', { email, password: 'wrongpass1' });
  assert.equal(bad.status, 401);
  const ok = await call('POST', '/auth/login', { email, password: 'Secret123' });
  assert.equal(ok.status, 200);
  const me = await call('GET', '/me', undefined, ok.json.token);
  assert.equal(me.json.user.email, email);
  assert.equal(me.json.user.verified, true);
  assert.equal(me.json.user.pw_hash, undefined); // never leaked
  await call('POST', '/auth/logout', {}, ok.json.token);
  assert.equal((await call('GET', '/me', undefined, ok.json.token)).status, 401);
  assert.equal((await call('GET', '/me', undefined, token)).status, 200); // other session unaffected
});

test('login is rate limited per email', async () => {
  const { email } = await newUser();
  let last = 0;
  for (let i = 0; i < 9; i++) last = (await call('POST', '/auth/login', { email, password: 'nope12345' })).status;
  assert.equal(last, 429);
});

test('unverified accounts cannot use AI until the email link is opened', async () => {
  const { token } = await newUser(false);
  assert.equal((await call('POST', '/analyze', { text: 'idea' }, token)).status, 403);
});

test('forgot and reset password with emailed code', async () => {
  const { email, token } = await newUser();
  assert.equal((await call('POST', '/auth/forgot', { email: 'ghost@example.com' })).status, 200); // no enumeration
  assert.equal((await call('POST', '/auth/forgot', { email })).status, 200);
  const code = outbox.filter((m) => m.to === email && /reset code/.test(m.subject)).at(-1)!.text.match(/code is (\w{8})/)![1];
  assert.equal((await call('POST', '/auth/reset', { email, code: 'WRONGCODE', password: 'NewSecret456' })).status, 400);
  assert.equal((await call('POST', '/auth/reset', { email, code, password: 'NewSecret456' })).status, 200);
  assert.equal((await call('POST', '/auth/reset', { email, code, password: 'NewSecret456' })).status, 400); // single use
  assert.equal((await call('GET', '/me', undefined, token)).status, 401); // old sessions ended
  assert.equal((await call('POST', '/auth/login', { email, password: 'NewSecret456' })).status, 200);
});

test('change password keeps this session, ends others', async () => {
  const { email, token } = await newUser();
  const other = (await call('POST', '/auth/login', { email, password: 'Secret123' })).json.token;
  assert.equal((await call('POST', '/auth/change-password', { currentPassword: 'wrong1234', newPassword: 'Another789' }, token)).status, 403);
  assert.equal((await call('POST', '/auth/change-password', { currentPassword: 'Secret123', newPassword: 'Another789' }, token)).status, 200);
  assert.equal((await call('GET', '/me', undefined, token)).status, 200);
  assert.equal((await call('GET', '/me', undefined, other)).status, 401);
});

test('sync: last write wins, deletions propagate, users are isolated', async () => {
  const a = await newUser(), b = await newUser();
  const idea = (id: string, text: string, updatedAt: string) => ({ id, title: 'T', transcript: text, createdAt: updatedAt, updatedAt, images: [{ id: 'i', uri: 'file://x', createdAt: updatedAt }], report: null, reportFor: '', imagesChanged: false });
  let r = await call('POST', '/sync', { since: '', ideas: [idea('1', 'first', '2026-01-01T00:00:00.000Z')], deleted: [] }, a.token);
  assert.equal(r.status, 200);
  const cursor = r.json.serverTime;
  // an older edit from another device must not overwrite the newer server copy
  await call('POST', '/sync', { since: cursor, ideas: [idea('1', 'stale', '2025-12-31T00:00:00.000Z')], deleted: [] }, a.token);
  await call('POST', '/sync', { since: cursor, ideas: [idea('1', 'newer', '2026-02-01T00:00:00.000Z')], deleted: [] }, a.token);
  r = await call('POST', '/sync', { since: '', ideas: [], deleted: [] }, a.token);
  assert.equal(r.json.ideas.length, 1);
  assert.equal(r.json.ideas[0].transcript, 'newer');
  assert.deepEqual(r.json.ideas[0].images, []); // images not synced yet
  assert.equal((await call('POST', '/sync', { since: '', ideas: [], deleted: [] }, b.token)).json.ideas.length, 0);
  r = await call('POST', '/sync', { since: '', ideas: [], deleted: ['1'] }, a.token);
  assert.equal(r.json.ideas.length, 0);
  assert.deepEqual(r.json.deleted, ['1']);
  // a stale re-upload cannot resurrect a deleted idea
  await call('POST', '/sync', { since: '', ideas: [idea('1', 'zombie', '2026-01-15T00:00:00.000Z')], deleted: [] }, a.token);
  r = await call('POST', '/sync', { since: '', ideas: [], deleted: [] }, a.token);
  assert.equal(r.json.ideas.length, 0);
});

test('delete account removes the user and data', async () => {
  const { email, token } = await newUser();
  await call('POST', '/sync', { since: '', ideas: [{ id: 'x', updatedAt: '2026-01-01T00:00:00.000Z', transcript: 'a' }], deleted: [] }, token);
  assert.equal((await call('POST', '/auth/delete', { password: 'wrong1234' }, token)).status, 403);
  assert.equal((await call('POST', '/auth/delete', { password: 'Secret123' }, token)).status, 200);
  assert.equal((await call('GET', '/me', undefined, token)).status, 401);
  assert.equal((await call('POST', '/auth/login', { email, password: 'Secret123' })).status, 401);
});

test('/analyze parses fenced JSON and enforces free limit', async () => {
  const { token } = await newUser();
  mockUpstream(() => ({ content: [{ type: 'text', text: 'Here:\n```json\n' + JSON.stringify(REPORT) + '\n```' }] }));
  const statuses: number[] = [];
  for (let i = 0; i < 4; i++) {
    const r = await call('POST', '/analyze', { text: 'A roofing app' }, token);
    statuses.push(r.status);
    if (i === 0) assert.equal(r.json.score, 62);
  }
  globalThis.fetch = realFetch;
  assert.deepEqual(statuses, [200, 200, 200, 402]);
});

test('/file keeps only real candidate ids', async () => {
  const { token } = await newUser();
  mockUpstream(() => ({ content: [{ type: 'text', text: '{"text":"Clean.","decision":"unsure","candidates":["a","zzz"],"title":"T"}' }] }));
  const r = await call('POST', '/file', { transcript: 'um roof', ideas: [{ id: 'a', title: 'Roof', summary: 'x' }] }, token);
  globalThis.fetch = realFetch;
  assert.deepEqual(r.json.candidates, ['a']);
  assert.equal(r.json.decision, 'unsure');
});

test('/transcribe returns text from the provider', async () => {
  const { token } = await newUser();
  mockUpstream(() => ({ text: ' hello roof ' }));
  const r = await call('POST', '/transcribe', { audio: Buffer.from('abc').toString('base64'), mimeType: 'audio/m4a' }, token);
  globalThis.fetch = realFetch;
  assert.equal(r.json.text, 'hello roof');
});

test('rate limit blocks after max', () => {
  assert.equal(rateLimit('rl', 2, 1000, 0), true);
  assert.equal(rateLimit('rl', 2, 1000, 1), true);
  assert.equal(rateLimit('rl', 2, 1000, 2), false);
  assert.equal(rateLimit('rl', 2, 1000, 2000), true);
});

test.after(() => server.close());
