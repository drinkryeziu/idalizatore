// SAMPLE plans and prices from the prototype (handoff section 7): not decisions. Limits are enforced in the database.
export type PlanId = 'free' | 'plus' | 'pro';
export const PLANS: { id: PlanId; name: string; tag?: string; month: number; year: number; limit: number | null; feats: string[] }[] = [
  { id: 'free', name: 'Free', month: 0, year: 0, limit: 10, feats: ['10 analyzed ideas in total', 'Saved on this iPhone only', 'Score and five-part report'] },
  { id: 'plus', name: 'Plus', month: 6, year: 57.6, limit: 20, feats: ['20 analyzed ideas a month', 'Backup to your account', 'Similar ideas & companies', 'Export your ideas'] },
  { id: 'pro', name: 'Pro', tag: 'Most popular', month: 12, year: 115.2, limit: null, feats: ['Unlimited analyzed ideas', 'Backup and sync on every device', 'Equipment & where-to-buy lists', 'Priority analysis'] },
];
export const planOf = (id: PlanId) => PLANS.find((p) => p.id === id) ?? PLANS[0];
export const money = (n: number) => '$' + (Math.round(n * 100) % 100 === 0 ? String(Math.round(n)) : n.toFixed(2));
