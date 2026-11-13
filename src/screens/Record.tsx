import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, Text, TextInput, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import { Icon } from '../components/Icon';
import { Button } from '../components/ui';
import { color, size, space, type } from '../theme';
import { useApp } from '../store';

/** Hold to record. Voice capture + transcription need the backend (handoff section 6); until then the typing fallback files ideas. */
export function Record() {
  const { addIdea, go } = useApp();
  const [holding, setHolding] = useState(false);
  const [typed, setTyped] = useState('');
  const [note, setNote] = useState('');

  function save() {
    const text = typed.trim();
    if (!text) return;
    // TODO(backend): call POST /file (prompt 5.1) to polish and route; for now every typed idea is new.
    const title = text.split(/\s+/).slice(0, 4).join(' ');
    addIdea(title, text);
    setTyped(''); setNote('Saved to Recorded Ideas.');
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1, padding: space[4] }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={{ paddingLeft: space[10], marginTop: space[8] }}>
        <Text style={[type.hero, { color: color.paper }]}>Speak your{'\n'}idea.</Text>
      </View>
      <View style={{ flex: 1 }} />
      <TextInput accessibilityLabel="Type your idea" multiline placeholder="Or type your idea here" placeholderTextColor={color.inkSoft}
        value={typed} onChangeText={setTyped}
        style={{ minHeight: 96, padding: space[3], borderRadius: 4, backgroundColor: color.paper, color: color.ink, fontFamily: 'FiraSans_400Regular', fontSize: 16, textAlignVertical: 'top' }} />
      {typed.trim() ? <View style={{ marginTop: space[3] }}><Button label="Save idea" tone="light" onPress={save} /></View> : null}
      <View style={{ alignItems: 'center', paddingVertical: space[6], gap: space[2] }}>
        <Pressable accessibilityRole="button" accessibilityLabel="Hold to record"
          onPressIn={() => { setHolding(true); Haptics.impactAsync(); setNote('Voice capture arrives with the transcription backend.'); }}
          onPressOut={() => setHolding(false)}
          style={{ width: size.recordHalo, height: size.recordHalo, borderRadius: 999, alignItems: 'center', justifyContent: 'center', backgroundColor: holding ? color.violetDeep : 'transparent' }}>
          <View style={{ width: holding ? 64 : size.record, height: holding ? 64 : size.record, borderRadius: 999, borderWidth: 5, borderColor: holding ? color.violet : color.paper, backgroundColor: holding ? color.violet : 'transparent', alignItems: 'center', justifyContent: 'center' }}>
            <Icon name="mic" size={32} color={color.paper} />
          </View>
        </Pressable>
        <Text style={[type.meta, { color: color.paper, minHeight: 18 }]}>{holding ? 'Release to stop' : note || 'Hold to record'}</Text>
        {note === 'Saved to Recorded Ideas.' && <Button label="Open Recorded Ideas" tone="light" onPress={() => go('ideas')} />}
      </View>
    </KeyboardAvoidingView>
  );
}
