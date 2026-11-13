// Thin Anthropic Messages API client with timeout and retry. The API key never leaves the server.
const URL_ = 'https://api.anthropic.com/v1/messages';

export type Img = { mediaType: string; data: string };

export async function complete(prompt: string, opts: { images?: Img[]; maxTokens?: number; fetchImpl?: typeof fetch } = {}): Promise<string> {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) throw Object.assign(new Error('ANTHROPIC_API_KEY is not set'), { status: 500 });
  const f = opts.fetchImpl ?? fetch;
  const content: unknown[] = (opts.images ?? []).map((i) => ({ type: 'image', source: { type: 'base64', media_type: i.mediaType, data: i.data } }));
  content.push({ type: 'text', text: prompt });
  const body = JSON.stringify({ model: process.env.ANTHROPIC_MODEL || 'claude-sonnet-5-5', max_tokens: opts.maxTokens ?? 4000, messages: [{ role: 'user', content }] });

  let lastErr: unknown;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const res = await f(URL_, {
        method: 'POST', signal: AbortSignal.timeout(60_000), body,
        headers: { 'content-type': 'application/json', 'x-api-key': key, 'anthropic-version': '2023-06-01' },
      });
      if (res.status === 429 || res.status >= 500) throw Object.assign(new Error(`upstream ${res.status}`), { retry: true });
      if (!res.ok) throw Object.assign(new Error(`upstream ${res.status}`), { status: 502 });
      const j: any = await res.json();
      return (j.content ?? []).filter((b: any) => b.type === 'text').map((b: any) => b.text).join('');
    } catch (e: any) {
      lastErr = e;
      const retryable = e?.retry || e?.name === 'TimeoutError' || e?.name === 'TypeError';
      if (!retryable || attempt === 2) break;
      await new Promise((r) => setTimeout(r, 500 * 2 ** attempt));
    }
  }
  console.error('[claude] failed', (lastErr as Error)?.message);
  throw Object.assign(new Error('The AI service is unavailable. Try again.'), { status: 502 });
}
