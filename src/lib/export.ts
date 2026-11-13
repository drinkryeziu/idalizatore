import { Platform, Share } from 'react-native';
import type { Idea } from '../ai/types';
import { stamp } from './format';

/** "Export my ideas": a JSON file download on the web, the share sheet on the iPhone. */
export async function exportIdeas(ideas: Idea[]): Promise<void> {
  const data = JSON.stringify(ideas.map((i) => ({ title: i.title, recorded: stamp(i.createdAt), text: i.transcript, score: i.report ? i.report.score : null })), null, 2);
  if (Platform.OS === 'web') {
    const url = URL.createObjectURL(new Blob([data], { type: 'application/json' }));
    const a = document.createElement('a');
    a.href = url; a.download = 'idealizator-ideas.json'; a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    return;
  }
  await Share.share({ message: data, title: 'idealizator-ideas.json' });
}
