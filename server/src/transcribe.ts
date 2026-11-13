// Speech-to-text via OpenAI file transcription (handoff section 6). The key stays on the server.
// whisper-1 is deprecated (shuts down 2027-02-26); the model id is configurable. Check current pricing before budgeting.
export async function transcribe(audio: Buffer, mimeType: string, fetchImpl: typeof fetch = fetch): Promise<string> {
  const key = process.env.OPENAI_API_KEY;
  if (!key) throw Object.assign(new Error('OPENAI_API_KEY is not set'), { status: 500 });
  const ext = mimeType.includes('mp4') || mimeType.includes('m4a') || mimeType.includes('aac') ? 'm4a' : mimeType.includes('wav') ? 'wav' : mimeType.includes('webm') ? 'webm' : 'm4a';
  const form = new FormData();
  form.append('file', new Blob([new Uint8Array(audio)], { type: mimeType }), `recording.${ext}`);
  form.append('model', process.env.TRANSCRIBE_MODEL || 'gpt-transcribe');
  let res: Response;
  try {
    res = await fetchImpl('https://api.openai.com/v1/audio/transcriptions', { method: 'POST', headers: { authorization: `Bearer ${key}` }, body: form, signal: AbortSignal.timeout(60_000) });
  } catch { throw Object.assign(new Error('Transcription is unavailable. Try again.'), { status: 502 }); }
  if (!res.ok) { console.error('[transcribe] upstream', res.status); throw Object.assign(new Error('Transcription failed. Try again.'), { status: 502 }); }
  const j: any = await res.json();
  return String(j.text ?? '').trim();
}
