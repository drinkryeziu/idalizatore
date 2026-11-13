// Per-instance burst limit. On serverless hosting each instance has its own memory, so this only smooths bursts;
// the monthly plan limit is enforced in the database (idealizator_analysis_status / idealizator_count_analysis).
const hits = new Map<string, number[]>();
/** Sliding-window rate limit: at most `max` calls per `windowMs`. */
export function rateLimit(userId: string, max = 20, windowMs = 60_000, now = Date.now()): boolean {
  const recent = (hits.get(userId) ?? []).filter((t) => now - t < windowMs);
  if (recent.length >= max) { hits.set(userId, recent); return false; }
  recent.push(now); hits.set(userId, recent); return true;
}
