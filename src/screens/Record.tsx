import { useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, Text, TextInput, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import { RecordingPresets, requestRecordingPermissionsAsync, setAudioModeAsync, useAudioRecorder } from 'expo-audio';
import { readAsStringAsync } from 'expo-file-system/legacy';
import { Icon } from '../components/Icon';
import { Button } from '../components/ui';
import { color, radius, size, space, type } from '../theme';
import { useApp } from '../store';
import { fileRecording, transcribeAudio } from '../api';
import type { Filed } from '../ai/types';

/** Hold to record. Voice capture + transcription need the backend endpoint (handoff section 6); until then the typing fallback goes through the same AI filing. */
export function Record() {
  const { addIdea, appendToIdea, ideas, go } = useApp();
  const [typed, setTyped] = useState('');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [ask, setAsk] = useState<{ filed: Filed } | null>(null);

  const fallbackTitle = (t: string) => t.split(/\s+/).slice(0, 4).join(' ');

  const save = () => fileText(typed.trim());

  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const startedAt = useRef(0);
  const [recording, setRecording] = useState(false);
  const [screenReader, setScreenReader] = useState(false);
  useEffect(() => { AccessibilityInfo.isScreenReaderEnabled().then(setScreenReader); }, []);

  async function startVoice() {
    if (busy || recording) return;
    const perm = await requestRecordingPermissionsAsync();
    if (!perm.granted) { setNote('Microphone access is off. Turn it on in Settings, or type your idea.'); return; }
    try {
      await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });
      await recorder.prepareToRecordAsync();
      recorder.record(); startedAt.current = Date.now(); setRecording(true); setNote('');
      Haptics.impactAsync();
    } catch { setNote('Could not start recording. Type your idea instead.'); }
  }

  async function stopVoice() {
    if (!recording) return;
    setRecording(false);
    try { await recorder.stop(); await setAudioModeAsync({ allowsRecording: false }); } catch {}
    if (Date.now() - startedAt.current < 600) { setNote('Hold a little longer while you speak.'); return; }
    const uri = recorder.uri;
    if (!uri) { setNote('Nothing was recorded.'); return; }
    setBusy(true); setNote(''); useApp.getState().setProcessing('Processing');
    try {
      const b64 = await readAsStringAsync(uri, { encoding: 'base64' });
      const { text } = await transcribeAudio(b64, 'audio/m4a');
      setBusy(false);
      if (!text.trim()) { useApp.getState().setProcessing(null); setNote('I did not catch that. Try again.'); return; }
      await fileText(text, true);
    } catch (e: any) { setBusy(false); useApp.getState().setProcessing(null); setNote(e.message || 'Could not process the recording.'); }
  }

  /** Raw speech is never shown or saved: only the AI-polished text is kept (handoff 3.2). */
  async function fileText(raw: string, fromVoice = false) {
    if (!raw || busy && !fromVoice) return;
    setBusy(true); setNote(''); useApp.getState().setProcessing('Processing');
    try {
      const filed = await fileRecording(raw, ideas);
      if (!filed.text) { setNote('No idea found in that. Nothing was saved.'); setTyped(''); return; }
      if (filed.decision === 'existing' && filed.candidates[0]) { appendToIdea(filed.candidates[0], filed.text); setNote('Added to your idea.'); setTyped(''); }
      else if (filed.decision === 'unsure' && filed.candidates.length) setAsk({ filed });
      else { addIdea(filed.title || fallbackTitle(filed.text), filed.text); setNote('Saved as a new idea.'); setTyped(''); }
    } catch (e: any) {
      if (fromVoice) { setNote(`${e.message} Your recording was not saved. Try again or type it.`); return; }
      // Typed text: keep the person's words rather than lose them.
      addIdea(fallbackTitle(raw), raw); setTyped(''); setNote(`${e.message} Saved as a new idea without AI cleanup.`);
    } finally { setBusy(false); useApp.getState().setProcessing(null); }
  }

  function choose(id: string | null) {
    if (!ask) return;
    const { filed } = ask;
    if (id) appendToIdea(id, filed.text); else addIdea(filed.title || fallbackTitle(filed.text), filed.text);
    setAsk(null); setTyped(''); setNote(id ? 'Added to your idea.' : 'Saved as a new idea.');
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1, padding: space[4] }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={{ paddingLeft: space[10], marginTop: space[8] }}>
        <Text style={[type.hero, { color: color.paper }]}>Speak your{'\n'}idea.</Text>
      </View>
      <View style={{ flex: 1 }} />
      <TextInput accessibilityLabel="Type your idea" multiline placeholder="Or type your idea here" placeholderTextColor={color.inkSoft}
        value={typed} onChangeText={setTyped} editable={!busy}
        style={{ minHeight: 96, padding: space[3], borderRadius: 4, backgroundColor: color.paper, color: color.ink, fontFamily: 'FiraSans_400Regular', fontSize: 16, textAlignVertical: 'top' }} />
      {typed.trim() ? <View style={{ marginTop: space[3] }}>{busy ? <ActivityIndicator color={color.paper} /> : <Button label="Save idea" tone="light" onPress={save} />}</View> : null}
      <View style={{ alignItems: 'center', paddingVertical: space[6], gap: space[2] }}>
        <Pressable accessibilityRole="button" accessibilityLabel={screenReader ? (recording ? 'Stop recording' : 'Start recording') : 'Hold to record'}
          onPressIn={() => { if (!screenReader) startVoice(); }} onPressOut={() => { if (!screenReader) stopVoice(); }}
          onPress={() => { if (screenReader) (recording ? stopVoice() : startVoice()); }}
          style={{ width: size.recordHalo, height: size.recordHalo, borderRadius: 999, alignItems: 'center', justifyContent: 'center', backgroundColor: recording ? color.violetDeep : 'transparent' }}>
          <View style={{ width: recording ? 64 : size.record, height: recording ? 64 : size.record, borderRadius: 999, borderWidth: 5, borderColor: recording ? color.violet : color.paper, backgroundColor: recording ? color.violet : 'transparent', alignItems: 'center', justifyContent: 'center' }}>
            <Icon name="mic" size={32} color={color.paper} />
          </View>
        </Pressable>
        {busy && !recording ? <ActivityIndicator color={color.paper} /> : null}
        <Text style={[type.meta, { color: color.paper, minHeight: 18, textAlign: 'center' }]}>{recording ? (screenReader ? 'Tap to stop' : 'Release to stop') : busy ? 'Working on it…' : note || (screenReader ? 'Tap to record' : 'Hold to record')}</Text>
        {/^(Saved|Added)/.test(note) && <Button label="Open Recorded Ideas" tone="light" onPress={() => go('ideas')} />}
      </View>

      {ask && (
        <View style={{ position: 'absolute', left: 0, right: 0, bottom: 0, padding: space[4], paddingBottom: space[8], backgroundColor: color.paper, borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl, gap: space[2] }} accessibilityViewIsModal>
          <Text style={[type.titleMd, { color: color.violetDeep }]}>Where should this go?</Text>
          <Text style={[type.body, { color: color.inkSoft, maxHeight: 120 }]} numberOfLines={5}>{ask.filed.text}</Text>
          {ask.filed.candidates.map((id) => {
            const i = ideas.find((x) => x.id === id);
            return i ? <Button key={id} label={`Add to ${i.title}`} tone="ghost" onPress={() => choose(id)} /> : null;
          })}
          <Button label="Save as a new idea" onPress={() => choose(null)} />
        </View>
      )}
    </KeyboardAvoidingView>
  );
}
