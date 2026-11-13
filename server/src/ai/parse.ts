// Defensive parsers for the two AI JSON contracts (handoff section 5). Ported from the prototype's parseFiled / parseReport.
import type { Filed, Report, Section } from './types';

export class AiOutputError extends Error { code = 'bad_output'; }

function extractJson(text: string): any {
  const a = text.indexOf('{'), b = text.lastIndexOf('}');
  if (a < 0 || b < a) throw new AiOutputError('The AI did not return JSON.');
  return JSON.parse(text.slice(a, b + 1));
}
const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, n));

export function parseFiled(text: string, ideaIds: string[]): Filed {
  const j = extractJson(text);
  const candidates = (Array.isArray(j.candidates) ? j.candidates : []).map(String)
    .filter((c: string, k: number, arr: string[]) => ideaIds.includes(c) && arr.indexOf(c) === k).slice(0, 3);
  const decision = j.decision === 'existing' || j.decision === 'unsure' ? j.decision : 'new';
  return { text: String(j.text || '').trim(), decision, candidates, title: j.title ? String(j.title).slice(0, 60) : null };
}

export function parseReport(text: string): Report {
  const j = extractJson(text);
  const sections: Section[] = (j.sections || [])
    .filter((s: any) => s && s.title && Array.isArray(s.blocks))
    .map((s: any) => ({
      title: String(s.title),
      blocks: s.blocks
        .filter((bl: any) => bl && ((bl.kind === 'list' && Array.isArray(bl.items) && bl.items.length) || ((bl.kind === 'paragraph' || bl.kind === 'lead') && bl.text)))
        .map((bl: any) => (bl.kind === 'list' ? { kind: 'list', items: bl.items.map(String) } : { kind: bl.kind, text: String(bl.text) })),
    }));
  if (!sections.length) throw new AiOutputError('The AI report was empty.');

  const factors = (Array.isArray(j.factors) ? j.factors : [])
    .filter((f: any) => f && f.label && isFinite(Number(f.score))).slice(0, 6)
    .map((f: any) => ({ label: String(f.label).slice(0, 40), score: clamp(Math.round(Number(f.score)), 0, 100) }));

  let chart: Report['chart'] = null;
  const c = j.chart;
  if (c && Array.isArray(c.items)) {
    const items = c.items.filter((x: any) => x && x.label && isFinite(Number(x.value)) && Number(x.value) >= 0).slice(0, 5)
      .map((x: any) => ({ label: String(x.label).slice(0, 40), value: Number(x.value) }));
    const total = items.reduce((t: number, x: any) => t + x.value, 0);
    if (items.length >= 2 && total > 0) {
      chart = { title: String(c.title || '').slice(0, 60), kind: c.kind === 'bars' ? 'bars' : 'share', unit: String(c.unit || '').slice(0, 10),
        section: clamp(Math.round(Number(c.section) || sections.length), 1, sections.length), items };
    }
  }

  let similar: Report['similar'] = null;
  if (j.similar && Array.isArray(j.similar.items)) {
    const items = j.similar.items.filter((x: any) => x && x.name).slice(0, 5)
      .map((x: any) => ({ name: String(x.name).slice(0, 60), kind: x.kind ? String(x.kind).slice(0, 24) : '', note: x.note ? String(x.note).slice(0, 160) : '' }));
    if (items.length) similar = { title: String(j.similar.title || '').slice(0, 60), items };
  }

  let equipment: Report['equipment'] = null;
  if (j.equipment && Array.isArray(j.equipment.items)) {
    const items = j.equipment.items.filter((x: any) => x && x.item).slice(0, 5)
      .map((x: any) => ({ item: String(x.item).slice(0, 60), why: x.why ? String(x.why).slice(0, 160) : '',
        where: (Array.isArray(x.where) ? x.where : []).filter(Boolean).slice(0, 3).map((w: any) => String(w).slice(0, 40)) }));
    if (items.length) equipment = { title: String(j.equipment.title || '').slice(0, 60), items };
  }

  return {
    similar, equipment, verdict: j.verdict ? String(j.verdict).slice(0, 40) : null, factors, chart,
    lang: /^[A-Za-z]{2,3}(-[A-Za-z0-9]{2,8})*$/.test(j.language || '') ? j.language : null,
    langName: j.languageName ? String(j.languageName).slice(0, 40) : null,
    caption: j.caption ? String(j.caption).slice(0, 120) : null,
    title: j.title ? String(j.title).slice(0, 60) : null,
    score: clamp(Math.round(Number(j.score) || 0), 0, 100), sections,
  };
}
