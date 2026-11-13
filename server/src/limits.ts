// In-memory per-user limits. Replace with a database once real accounts exist (handoff 7, 8).
const hits = new Map<string, number[]>();
/** Sliding-window rate limit: at most `max` calls per `windowMs`. */
export function rateLimit(userId: string, max = 20, windowMs = 60_000, now = Date.now()): boolean {
  const recent = (hits.get(userId) ?? []).filter((t) => now - t < windowMs);
  if (recent.length >= max) { hits.set(userId, recent); return false; }
  recent.push(now); hits.set(userId, recent); return true;
}
const monthly = new Map<string, number>();
const monthKey = (u: string, d = new Date()) => `${u}:${d.getUTCFullYear()}-${d.getUTCMonth()}`;
export function analyzeUsed(userId: string) { return monthly.get(monthKey(userId)) ?? 0; }
export function countAnalyze(userId: string) { monthly.set(monthKey(userId), analyzeUsed(userId) + 1); }
export function analyzeLimitFor(plan: 'free' | 'plus' | 'pro'): number | null {
  return plan === 'pro' ? null : plan === 'plus' ? 20 : Number(process.env.FREE_ANALYZE_LIMIT || 3);
}
