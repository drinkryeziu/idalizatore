/** "9/12/2025 - 11:43 AM", the prototype's timestamp format. */
export function stamp(iso: string): string {
  const d = new Date(iso);
  let hr = d.getHours();
  const m = d.getMinutes(), ap = hr >= 12 ? 'PM' : 'AM';
  hr = hr % 12 || 12;
  return `${d.getMonth() + 1}/${d.getDate()}/${d.getFullYear()} - ${hr}:${m < 10 ? '0' : ''}${m} ${ap}`;
}
export function provisionalTitle(text: string): string {
  const w = text.replace(/[^\p{L}\p{N}\s'-]/gu, ' ').trim().split(/\s+/).slice(0, 4).join(' ');
  return w ? w.charAt(0).toUpperCase() + w.slice(1) : 'New idea';
}
export const fileSlug = (s: string) => (s || 'idea').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'idea';
export const verdictFor = (band: 'good' | 'medium' | 'bad') => (band === 'good' ? 'Strong potential' : band === 'medium' ? 'Promising, with risks' : 'High risk');
