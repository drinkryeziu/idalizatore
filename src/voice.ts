import { useCallback, useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, Platform } from 'react-native';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { RecordingPresets, requestRecordingPermissionsAsync, setAudioModeAsync, useAudioRecorder } from 'expo-audio';
import { readAudio } from './audio';
import { transcribeAudio } from './api';
import { fileIdea } from './filing';
import { useApp } from './store';

/**
 * Press and hold the mic: recording lasts only while it is held (handoff 3.1).
 * If hold isn't possible (VoiceOver), tap to start and tap to stop. As soon as a recording ends the app opens Recorded Ideas, where the new idea appears.
 */
export function useVoice(targetId: string | null) {
  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const [recording, setRecording] = useState(false);
  const [screenReader, setScreenReader] = useState(false);
  const rec = useRef(false), startedAt = useRef(0), starting = useRef<Promise<void> | null>(null);
  useEffect(() => { if (Platform.OS !== 'web') AccessibilityInfo.isScreenReaderEnabled().then(setScreenReader); }, []);
  const say = useApp((s) => s.say);

  const fail = useCallback((code: 'denied' | 'error') => {
    rec.current = false; setRecording(false);
    say(code === 'denied' ? 'Microphone not allowed. Allow it in your browser or phone settings, then hold the mic again.' : 'Voice isn’t working right now. Try again in a moment.', true);
  }, [say]);

  const start = useCallback(() => {
    if (rec.current) return;
    rec.current = true; setRecording(true);
    starting.current = (async () => {
      try {
        const perm = await requestRecordingPermissionsAsync();
        if (!perm.granted) return fail('denied');
        await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });
        await recorder.prepareToRecordAsync();
        recorder.record(); startedAt.current = Date.now();
        Haptics.impactAsync().catch(() => {});
      } catch { fail('error'); }
    })();
  }, [recorder, fail]);

  const stop = useCallback(async () => {
    if (!rec.current) return;
    rec.current = false; setRecording(false);
    await starting.current; // a quick release must wait for the recorder to finish starting
    if (!startedAt.current) return;
    try { await recorder.stop(); await setAudioModeAsync({ allowsRecording: false }); } catch { /* already stopped */ }
    const held = Date.now() - startedAt.current; startedAt.current = 0;
    if (held < 600) { say('I didn’t catch an idea. Keep the mic pressed while you talk.'); return; }
    const uri = recorder.uri;
    if (!uri) { say('I didn’t catch an idea. Try again.'); return; }
    router.navigate('/ideas'); // straight to Recorded Ideas; the new idea appears there when it is ready
    useApp.getState().setProcessing('Processing');
    try {
      const { base64, mimeType } = await readAudio(uri);
      const { text } = await transcribeAudio(base64, mimeType);
      if (!text.trim()) { useApp.getState().setProcessing(null); say('I didn’t catch an idea. Try again.'); return; }
      await fileIdea(text, targetId); // clears the processing screen when done
    } catch (e: any) { useApp.getState().setProcessing(null); say(e?.message || 'The recording couldn’t be processed.', true); }
  }, [targetId, recorder, say]);

  const canHold = !screenReader;
  const micProps = canHold
    ? { onPressIn: start, onPressOut: stop }
    : { onPress: () => { if (rec.current) stop(); else start(); } };
  const hint = recording ? (canHold ? 'Release to stop' : 'Tap to stop') : canHold ? 'Hold to record' : 'Tap to record';
  return { recording, canHold, micProps, hint };
}
