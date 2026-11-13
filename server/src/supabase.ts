// Talks to Supabase with the signed-in person's own token, so Postgres row-level security and auth.uid() apply to every call.
// The server needs only the project URL and the PUBLISHABLE key. It never holds a secret/service key.
export type SbUser = { id: string; email: string; name: string; confirmed: boolean };

const url = () => (process.env.SUPABASE_URL || '').replace(/\/$/, '');
const key = () => process.env.SUPABASE_PUBLISHABLE_KEY || '';

export async function userFromToken(token: string, fetchImpl: typeof fetch = fetch): Promise<SbUser | null> {
  if (!token || !url() || !key()) return null;
  try {
    const res = await fetchImpl(`${url()}/auth/v1/user`, { headers: { apikey: key(), authorization: `Bearer ${token}` }, signal: AbortSignal.timeout(10_000) });
    if (!res.ok) return null;
    const u: any = await res.json();
    if (!u?.id) return null;
    return { id: u.id, email: u.email ?? '', name: u.user_metadata?.name ?? '', confirmed: !!u.email_confirmed_at };
  } catch { return null; }
}

export async function rpc<T>(token: string, fn: string, args: unknown = {}, fetchImpl: typeof fetch = fetch): Promise<T> {
  const res = await fetchImpl(`${url()}/rest/v1/rpc/${fn}`, {
    method: 'POST', signal: AbortSignal.timeout(15_000),
    headers: { apikey: key(), authorization: `Bearer ${token}`, 'content-type': 'application/json' }, body: JSON.stringify(args),
  });
  if (!res.ok) { console.error('[supabase] rpc', fn, res.status); throw Object.assign(new Error('Database error.'), { status: 502 }); }
  const text = await res.text();
  return (text ? JSON.parse(text) : null) as T;
}
