import { Pressable, ScrollView, Text, View } from 'react-native';
import { Screen, TopBar } from '../components/chrome';
import { Icon } from '../components/Icon';
import { Chip, Lead, PageTitle, ResAct, Star, Tag } from '../components/ui';
import { bandFill, color, radius, scoreBand, space, typo } from '../theme';
import { useApp } from '../store';
import { isStale } from '../ai/types';
import { stamp, verdictFor } from '../lib/format';

/** Analyzed Ideas: every idea that has a report, with its score, verdict and a score bar. */
export function Reports() {
  const { ideas, openResult, go } = useApp();
  const list = ideas.filter((i) => i.report);
  return (
    <Screen tone="paper">
      <TopBar onBack={() => go('record')} />
      <ScrollView style={{ flex: 1, marginHorizontal: -space[4] }} contentContainerStyle={{ paddingHorizontal: space[4], paddingBottom: space[6] }}>
        <PageTitle>Analyzed Ideas</PageTitle>
        <Lead style={{ marginTop: space[1] }}>{list.length ? `${list.length} ${list.length === 1 ? 'idea has' : 'ideas have'} a report. Tap one to open it.` : 'Ideas you analyze appear here.'}</Lead>
        {list.length ? (
          <View style={{ gap: space[3], marginTop: space[3] }}>
            {list.map((i) => {
              const r = i.report!, band = scoreBand(r.score);
              return (
                <Pressable key={i.id} accessibilityRole="button" onPress={() => openResult(i.id)}
                  style={{ padding: space[4], paddingRight: space[4] + 28, gap: 4, borderWidth: 1, borderColor: color.violetLine, borderRadius: radius.lg, backgroundColor: color.paper }}>
                  <Text style={[typo.meta13, { color: color.inkSoft }]}>{stamp(i.createdAt)}</Text>
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center' }}>
                    <Text style={[typo.h3, { color: color.violetDeep }]}>{i.title}</Text>
                    <Chip score={r.score} />{r.score > 80 ? <Star /> : null}
                  </View>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: space[2] }}>
                    <Text style={[typo.body14m, { color: color.ink }]}>{r.verdict || verdictFor(band)}</Text>
                    {isStale(i) ? <Tag soft>Idea changed since</Tag> : null}
                  </View>
                  <View style={{ height: 6, marginTop: space[2], borderRadius: radius.full, backgroundColor: color.field, overflow: 'hidden' }}><View style={{ width: `${r.score}%`, height: 6, borderRadius: radius.full, backgroundColor: bandFill[band] }} /></View>
                  <View style={{ position: 'absolute', right: space[3], top: 0, bottom: 0, justifyContent: 'center' }}><Icon name="right" size={20} color={color.violet} /></View>
                </Pressable>
              );
            })}
          </View>
        ) : (
          <View style={{ marginTop: space[4], paddingVertical: space[5], paddingHorizontal: space[4], borderWidth: 1, borderStyle: 'dashed', borderColor: color.violetLine, borderRadius: radius.lg, alignItems: 'center', gap: space[4] }}>
            <Text style={[typo.body15, { color: color.inkSoft, textAlign: 'center' }]}>Record an idea, then tap “Analyze Idea” on its card to get a score, a business plan and a marketing plan.</Text>
            <ResAct primary label="Go to Recorded Ideas" onPress={() => go('ideas')} />
          </View>
        )}
      </ScrollView>
    </Screen>
  );
}
