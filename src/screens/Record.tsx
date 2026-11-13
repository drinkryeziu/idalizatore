import { useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, Text, TextInput, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import { Icon } from '../components/Icon';
import { Button } from '../components/ui';
import { color, radius, size, space, type } from '../theme';
import { useApp } from '../store';
import { fileRecording } from '../api';
import type { Filed } from '../ai/types';

/** Hold to record. Voice capture + transcription need the backend endpoint (handoff section 6); until then the typing fallback goes through the same AI filing. */
export function Record() {
  const { addIdea, appendToIdea, ideas, go } = useApp();
  const [holding, setHolding] = useState(false);
  const [typed, setTyped] = useState('');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [ask, setAsk] = useState<{ filed: Filed } | null>(null);

  const fallbackTitle = (t: string) => t.split(/\s+/).slice(0, 4).join(' ');

  async function save() {
    const raw = typed.trim();
    if (!raw || busy) return;
    setBusy(true); setNote('');
    try {
      const filed = await fileRecording(raw, ideas);
      if (!filed.text) { setNote('No idea found in that. Nothing was saved.'); setTyped(''); return; }
      if (filed.decision === 'existing' && filed.candidates[0]) { appendToIdea(filed.candidates[0], filed.text); setNote('Added to your idea.'); setTyped(''); }
      else if (filed.decision === 'unsure' && filed.candidates.length) setAsk({ filed });
      else { addIdea(filed.title || fallbackTitle(filed.text), filed.text); setNote('Saved as a new idea.'); setTyped(''); }
    } catch (e: any) {
      // Offline or server down: keep the person's words rather than lose them.
      addIdea(fallbackTitle(raw), raw); setTyped(''); setNote(`${e.message} Saved as a new idea without AI cleanup.`);
    } finally { setBusy(false); }
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
        <Pressable accessibilityRole="button" accessibilityLabel="Hold to record"
          onPressIn={() => { setHolding(true); Haptics.impactAsync(); setNote('Voice capture arrives with the transcription backend.'); }}
          onPressOut={() => setHolding(false)}
          style={{ width: size.recordHalo, height: size.recordHalo, borderRadius: 999, alignItems: 'center', justifyContent: 'center', backgroundColor: holding ? color.violetDeep : 'transparent' }}>
          <View style={{ width: holding ? 64 : size.record, height: holding ? 64 : size.record, borderRadius: 999, borderWidth: 5, borderColor: holding ? color.violet : color.paper, backgroundColor: holding ? color.violet : 'transparent', alignItems: 'center', justifyContent: 'center' }}>
            <Icon name="mic" size={32} color={color.paper} />
          </View>
        </Pressable>
        <Text style={[type.meta, { color: color.paper, minHeight: 18, textAlign: 'center' }]}>{holding ? 'Release to stop' : note || 'Hold to record'}</Text>
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
