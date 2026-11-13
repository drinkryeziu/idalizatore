import type { Filed, Idea, Report } from './ai/types';
import { useApp } from './store';

// Set EXPO_PUBLIC_API_URL to the backend (on a real phone use your computer's LAN address, not localhost).
const BASE = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:8787';

export class ApiError extends Error { constructor(msg: string, public status = 0) { super(msg); } }

async function post<T>(path: string, body: unknown): Promise<T> {
  const user = useApp.getState().user;
  let res: Response;
  try {
    res = await fetch(BASE + path, {
      method: 'POST', signal: AbortSignal.timeout(90_000),
      headers: { 'content-type': 'application/json', authorization: `Bearer ${user?.id ?? ''}` }, body: JSON.stringify(body),
    });
  } catch { throw new ApiError('Cannot reach the server. Check your connection.'); }
  const j: any = await res.json().catch(() => ({}));
  if (!res.ok) throw new ApiError(j.error || `Server error (${res.status}).`, res.status);
  return j as T;
}

export const fileRecording = (transcript: string, ideas: Idea[], targetId?: string) =>
  post<Filed>('/file', { transcript, targetId, ideas: ideas.map((i) => ({ id: i.id, title: i.title, summary: i.transcript.replace(/\s+/g, ' ').slice(0, 320) })) });

export const analyzeIdea = (idea: Idea) => post<Report>('/analyze', { text: idea.transcript });

export const transcribeAudio = (audioBase64: string, mimeType: string) => post<{ text: string }>('/transcribe', { audio: audioBase64, mimeType });
