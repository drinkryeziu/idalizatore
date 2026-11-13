import { Pressable, ScrollView, Text, View } from 'react-native';
import { Chip } from './ui';
import { color, font, radius, space, typo } from '../theme';
import { useApp } from '../store';
import { chooseDestination } from '../filing';

/** "Where should this go?": shown when the AI can't tell which idea a recording belongs to. Best match first, then "Save as a new idea". */
export function ChoiceSheet() {
  const { choice, ideas, setChoice } = useApp();
  if (!choice) return null;
  const cancel = () => setChoice(null);
  return (
    <>
      <Pressable accessibilityRole="button" accessibilityLabel="Close" onPress={cancel} style={{ position: 'absolute', zIndex: 10, top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(37, 37, 37, 0.45)' }} />
      <View accessibilityViewIsModal style={{ position: 'absolute', zIndex: 11, left: 0, right: 0, bottom: 0, maxHeight: '80%', paddingTop: space[3], paddingHorizontal: space[4], paddingBottom: space[4], borderTopLeftRadius: 24, borderTopRightRadius: 24, backgroundColor: color.paper }}>
        <View style={{ alignSelf: 'center', width: 40, height: 4, marginBottom: space[4], borderRadius: radius.full, backgroundColor: color.track }} />
        <ScrollView>
          <Text accessibilityRole="header" style={[typo.titleMd, { color: color.violetDeep }]}>Where should this go?</Text>
          <Text style={[typo.body14, { color: color.inkSoft, marginTop: space[1], marginBottom: space[3] }]}>This sounds like it could belong to more than one idea. Pick where to save your recording.</Text>
          <View style={{ maxHeight: 96, marginBottom: space[4], padding: space[3], borderWidth: 1, borderColor: color.violetLine, borderLeftWidth: 3, borderLeftColor: color.violet, borderRadius: 12, backgroundColor: color.violetTint }}>
            <ScrollView nestedScrollEnabled><Text style={[typo.body14, { color: color.ink, writingDirection: 'auto' }]}>{choice.text}</Text></ScrollView>
          </View>
          <View style={{ gap: space[2] }}>
            {choice.candidates.map((id, k) => {
              const c = ideas.find((i) => i.id === id);
              if (!c) return null;
              const best = k === 0, sc = c.report?.score;
              return (
                <Pressable key={id} accessibilityRole="button" onPress={() => chooseDestination(id)}
                  style={{ flexDirection: 'row', alignItems: 'center', gap: space[3], padding: space[3], borderWidth: 1, borderRadius: 14, borderColor: best ? color.violet : color.violetLine, backgroundColor: best ? color.violetTint : color.paper }}>
                  <View style={{ flex: 1, gap: 2 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap' }}><Text style={[typo.body16m, { lineHeight: 22, color: color.ink }]}>{c.title}</Text>{sc != null ? <Chip score={sc} /> : null}</View>
                    <Text numberOfLines={2} style={[typo.meta13, { color: color.inkSoft, writingDirection: 'auto' }]}>{c.transcript.replace(/\s+/g, ' ').slice(0, 90) + (c.transcript.length > 90 ? '…' : '')}</Text>
                  </View>
                  <View style={{ paddingVertical: 4, paddingHorizontal: 10, borderWidth: 1, borderRadius: radius.full, borderColor: best ? color.violet : color.violetLine, backgroundColor: best ? color.violet : color.paper }}><Text style={{ fontFamily: font.medium, fontSize: 12, lineHeight: 16, color: best ? color.paper : color.violetDeep }}>Add to this</Text></View>
                  {best ? <View style={{ position: 'absolute', top: -9, right: 12, paddingHorizontal: 8, borderRadius: radius.full, backgroundColor: color.violet }}><Text style={[typo.tag11, { color: color.paper }]}>Best match</Text></View> : null}
                </Pressable>
              );
            })}
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: space[3] }}><View style={{ flex: 1, height: 1, backgroundColor: color.violetLine }} /><Text style={[typo.small12, { color: color.inkSoft }]}>or</Text><View style={{ flex: 1, height: 1, backgroundColor: color.violetLine }} /></View>
            <Pressable accessibilityRole="button" onPress={() => chooseDestination(null)} style={{ flexDirection: 'row', alignItems: 'center', gap: space[3], padding: space[3], borderWidth: 1, borderStyle: 'dashed', borderRadius: 14, borderColor: color.violetLine }}>
              <View style={{ width: 32, height: 32, borderRadius: radius.full, backgroundColor: color.violetTint, alignItems: 'center', justifyContent: 'center' }}><Text style={{ fontFamily: font.medium, fontSize: 20, color: color.violetDeep }}>+</Text></View>
              <View style={{ flex: 1, gap: 2 }}>
                <Text style={[typo.body16m, { lineHeight: 22, color: color.ink }]}>Save as a new idea</Text>
                {choice.title ? <Text numberOfLines={2} style={[typo.meta13, { color: color.inkSoft }]}>{choice.title}</Text> : null}
              </View>
            </Pressable>
          </View>
          <Pressable accessibilityRole="button" onPress={cancel} style={{ alignSelf: 'center', marginTop: space[3], paddingVertical: space[2], paddingHorizontal: space[4] }}><Text style={[typo.body14m, { color: color.inkSoft }]}>Cancel</Text></Pressable>
        </ScrollView>
      </View>
    </>
  );
}
