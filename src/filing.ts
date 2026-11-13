import { router } from 'expo-router';
import { useApp } from './store';
import { fileRecording } from './api';
import { provisionalTitle } from './lib/format';

const st = () => useApp.getState();

function open(id: string) { st().setOpenId(id); router.navigate('/ideas'); }
function addTo(id: string, text: string): boolean {
  const idea = st().ideas.find((i) => i.id === id);
  if (!idea) return false;
  st().appendToIdea(id, text);
  open(id); st().say(`Added to ${idea.title}.`);
  return true;
}
function addNew(title: string | null, text: string) {
  open(st().addIdea(title || provisionalTitle(text), text));
  st().say('Saved as a new idea.');
}

/** Tidy the words with the AI and decide which idea they belong to (handoff 3.3). On any AI problem the words are kept as spoken. */
export async function fileIdea(raw: string, targetId?: string | null): Promise<void> {
  st().setProcessing('Processing');
  try {
    const out = await fileRecording(raw, st().ideas, targetId ?? undefined);
    if (!out.text) { st().say('I didn’t catch an idea in that. Try again.'); return; }
    if (targetId) { if (!addTo(targetId, out.text)) addNew(out.title, out.text); return; }
    if (out.decision === 'existing' && out.candidates.length && addTo(out.candidates[0], out.text)) return;
    if (out.decision === 'unsure' && out.candidates.length) { st().setChoice({ text: out.text, title: out.title, candidates: out.candidates }); router.navigate('/ideas'); return; }
    addNew(out.title, out.text);
  } catch {
    if (!(targetId && addTo(targetId, raw))) addNew(null, raw);
    st().say('Saved as recorded: the AI couldn’t tidy the text this time.');
  } finally { st().setProcessing(null); }
}

/** Answer from the "Where should this go?" sheet: an idea id, or null for a new idea. */
export function chooseDestination(id: string | null) {
  const c = st().choice;
  if (!c) return;
  st().setChoice(null);
  if (!(id && addTo(id, c.text))) addNew(c.title, c.text);
}
