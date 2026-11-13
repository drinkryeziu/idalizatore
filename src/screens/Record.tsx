import { KeyboardAvoidingView, Platform, Text, TextInput, View } from 'react-native';
import { Em, Hero, RecordButton, Screen, TopBar, Waveform } from '../components/chrome';
import { color, font, radius, space, typo } from '../theme';
import { useVoice } from '../voice';

/** "Ready to record": hold the mic and speak. With no voice available, tap the mic and type instead. */
export function Record() {
  const v = useVoice(null);
  return (
    <Screen tone="violet">
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <TopBar tone="violet" />
        <View style={{ height: 172, flexShrink: 1 }} />
        <Hero>Start <Em>recording</Em>{'\n'}your <Em>ideas</Em>!</Hero>
        {v.recording ? (
          <View style={{ marginTop: space[4], gap: space[2] }} accessibilityLiveRegion="polite">
            {!v.typing ? (
              <Text style={[typo.body19, { marginLeft: space[20], paddingRight: space[4], color: color.paper, opacity: 0.75, fontStyle: 'italic' }]}>
                {v.canHold ? 'Listening… let go of the mic when you’re done.' : 'Listening… tap the mic when you’re done.'}
              </Text>
            ) : (
              <TextInput accessibilityLabel="Your idea" multiline autoFocus numberOfLines={4} value={v.typed} onChangeText={v.setTyped}
                placeholder="Type your idea in any language, then tap the mic to save it." placeholderTextColor={color.inkSoft}
                style={[typo.body19, { minHeight: 120, padding: space[3], borderRadius: radius.sm, backgroundColor: color.paper, color: color.ink, textAlignVertical: 'top', fontFamily: font.regular }, Platform.OS === 'web' ? ({ outlineStyle: 'none' } as any) : null]} />
            )}
          </View>
        ) : null}
        <View style={{ flex: 1, minHeight: space[6], justifyContent: 'center', marginHorizontal: -space[4] }}>{v.recording && !v.typing ? <Waveform height={160} /> : null}</View>
        <View style={{ alignItems: 'center', gap: space[1], paddingBottom: space[10] }}>
          <RecordButton recording={v.recording} label={v.canHold ? 'Hold to record' : v.recording ? 'Stop recording' : 'Start recording'} {...v.micProps} />
          <Text accessibilityLiveRegion="polite" style={[typo.nav, { color: color.paper, textAlign: 'center', minHeight: 16 }]}>{v.hint}</Text>
        </View>
      </KeyboardAvoidingView>
    </Screen>
  );
}
