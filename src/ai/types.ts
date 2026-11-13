export type Block = { kind: 'paragraph' | 'lead'; text: string } | { kind: 'list'; items: string[] };
export type Section = { title: string; blocks: Block[] };
export type Report = {
  similar: { title: string; items: { name: string; kind: string; note: string }[] } | null;
  equipment: { title: string; items: { item: string; why: string; where: string[] }[] } | null;
  verdict: string | null;
  factors: { label: string; score: number }[];
  chart: { title: string; kind: 'share' | 'bars'; unit: string; section: number; items: { label: string; value: number }[] } | null;
  lang: string | null; langName: string | null; caption: string | null; title: string | null;
  score: number; sections: Section[];
};
export type Filed = { text: string; decision: 'existing' | 'unsure' | 'new'; candidates: string[]; title: string | null };
export type Idea = {
  id: string; userId?: string; createdAt: string; updatedAt: string; title: string; transcript: string;
  images: { id: string; uri: string; createdAt: string }[];
  report: Report | null; reportFor: string; imagesChanged: boolean;
};
export const isStale = (i: Idea) => !!i.report && (i.reportFor !== i.transcript || i.imagesChanged);
