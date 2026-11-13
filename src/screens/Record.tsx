import { KeyboardAvoidingView, Platform, Text, View } from 'react-native';
import { Em, Hero, RecordButton, Screen, TopBar, Waveform } from '../components/chrome';
import { color, space, typo } from '../theme';
import { useVoice } from '../voice';

/** "Ready to record": hold the mic and speak. */
export function Record() {
  const v = useVoice(null);
  return (
    <Screen tone="violet">
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <TopBar tone="violet" />
        <View style={{ height: 172, flexShrink: 1 }} />
        <Hero>Start <Em>recording</Em>{'\n'}your <Em>ideas</Em>!</Hero>
        {v.recording ? (
          <View style={{ marginTop: space[4] }} accessibilityLiveRegion="polite">
            <Text style={[typo.body19, { marginLeft: space[20], paddingRight: space[4], color: color.paper, opacity: 0.75, fontStyle: 'italic' }]}>
              {v.canHold ? 'Listening… let go of the mic when you’re done.' : 'Listening… tap the mic when you’re done.'}
            </Text>
          </View>
        ) : null}
        <View style={{ flex: 1, minHeight: space[6], justifyContent: 'center', marginHorizontal: -space[4] }}>{v.recording ? <Waveform height={160} /> : null}</View>
        <View style={{ alignItems: 'center', gap: space[1], paddingBottom: space[10] }}>
          <RecordButton recording={v.recording} label={v.canHold ? 'Hold to record' : v.recording ? 'Stop recording' : 'Start recording'} {...v.micProps} />
          <Text accessibilityLiveRegion="polite" style={[typo.nav, { color: color.paper, textAlign: 'center', minHeight: 16 }]}>{v.hint}</Text>
        </View>
      </KeyboardAvoidingView>
    </Screen>
  );
}
