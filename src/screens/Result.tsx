import { Linking, Pressable, ScrollView, Share, Text, View } from 'react-native';
import { Button, PageTitle } from '../components/ui';
import { bandColor, color, radius, scoreBand, space, type } from '../theme';
import { useApp } from '../store';
import type { Report } from '../ai/types';

const search = (q: string) => Linking.openURL('https://www.google.com/search?q=' + encodeURIComponent(q));

function asText(r: Report, title: string) {
  const body = r.sections.map((s) => s.title + '\n' + s.blocks.map((b) => (b.kind === 'list' ? b.items.map((i) => '- ' + i).join('\n') : b.text)).join('\n')).join('\n\n');
  return `${title}\n${r.score}% ${r.verdict ?? ''}\n\n${body}`;
}

export function Result() {
  const { ideas, resultId, go } = useApp();
  const idea = ideas.find((i) => i.id === resultId);
  const r = idea?.report;
  if (!idea || !r) return <View style={{ padding: space[4] }}><Text style={type.body}>No report.</Text><Button label="Back" onPress={() => go('ideas')} /></View>;
  const band = scoreBand(r.score), rtl = ['ar', 'he', 'fa', 'ur'].includes((r.lang || '').slice(0, 2));
  const H = ({ children }: { children: string }) => <Text style={[type.bodyStrong, { color: color.violetDeep, marginBottom: space[2] }]}>{children}</Text>;

  return (
    <View style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={{ padding: space[4], gap: space[5] }}>
        <PageTitle>Result</PageTitle>
        <Text style={[type.titleMd, { color: color.violetDeep, writingDirection: rtl ? 'rtl' : 'ltr' }]}>{r.title || idea.title}</Text>

        <View style={{ alignItems: 'center', padding: space[5], borderRadius: radius.lg, backgroundColor: color.violetTint, borderWidth: 1, borderColor: color.violetLine }}>
          <Text accessibilityLabel={`Score ${r.score} percent`} style={{ fontFamily: 'FiraSans_600SemiBold', fontSize: 56, color: bandColor[band] }}>{r.score}%{r.score > 80 ? ' ★' : ''}</Text>
          <Text style={[type.bodyStrong, { color: color.ink }]}>{r.verdict}</Text>
          <Text style={[type.meta, { color: color.inkSoft }]}>{r.caption || 'The forecasted success rate.'} AI estimate, not a promise.</Text>
        </View>

        {r.factors.length > 0 && (
          <View style={{ gap: space[3] }}>
            <H>What drives the score</H>
            {r.factors.map((f) => (
              <View key={f.label} style={{ gap: 4 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}><Text style={type.meta}>{f.label}</Text><Text style={type.meta}>{f.score}</Text></View>
                <View style={{ height: 8, borderRadius: 9, backgroundColor: color.field, overflow: 'hidden' }}><View style={{ width: `${f.score}%`, height: 8, backgroundColor: color.violet }} /></View>
              </View>
            ))}
          </View>
        )}

        {r.sections.map((s, n) => (
          <View key={s.title} style={{ gap: space[3] }}>
            <H>{s.title}</H>
            {s.blocks.map((b, k) => b.kind === 'list'
              ? <View key={k} style={{ gap: 4 }}>{b.items.map((it, m) => <Text key={m} style={[type.body, { fontSize: 16, writingDirection: rtl ? 'rtl' : 'ltr' }]}>· {it}</Text>)}</View>
              : <Text key={k} style={[type.body, { fontSize: 16, writingDirection: rtl ? 'rtl' : 'ltr' }, b.kind === 'lead' && { fontFamily: 'FiraSans_500Medium' }]}>{b.text}</Text>)}
            {r.chart && r.chart.section === n + 1 && (
              <View style={{ gap: space[2], paddingTop: space[3], borderTopWidth: 1, borderTopColor: color.violetLine }}>
                <Text style={type.bodyStrong}>{r.chart.title} <Text style={[type.meta, { color: color.inkSoft }]}>AI estimate</Text></Text>
                {r.chart.items.map((it) => {
                  const max = Math.max(...r.chart!.items.map((x) => x.value));
                  return (
                    <View key={it.label} style={{ gap: 2 }}>
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}><Text style={type.meta}>{it.label}</Text><Text style={type.meta}>{r.chart!.unit === '%' ? `${it.value}%` : `${r.chart!.unit}${it.value}`}</Text></View>
                      <View style={{ height: 8, borderRadius: 9, backgroundColor: color.field, overflow: 'hidden' }}><View style={{ width: `${(it.value / max) * 100}%`, height: 8, backgroundColor: color.violet }} /></View>
                    </View>
                  );
                })}
              </View>
            )}
          </View>
        ))}

        {r.similar && (
          <View style={{ gap: space[2] }}>
            <H>{r.similar.title || 'Similar ideas & companies'}</H>
            <Text style={[type.meta, { color: color.inkSoft }]}>AI estimate, not verified. Tap a name to search the web.</Text>
            {r.similar.items.map((x) => (
              <Pressable key={x.name} accessibilityRole="link" onPress={() => search(x.name)} style={{ minHeight: 44, justifyContent: 'center' }}>
                <Text style={[type.bodyStrong, { color: color.violetDeep }]}>{x.name} <Text style={[type.meta, { color: color.inkSoft }]}>{x.kind}</Text></Text>
                {x.note ? <Text style={type.meta}>{x.note}</Text> : null}
              </Pressable>
            ))}
          </View>
        )}

        {r.equipment && (
          <View style={{ gap: space[2] }}>
            <H>{r.equipment.title || 'Equipment & where to buy'}</H>
            <Text style={[type.meta, { color: color.inkSoft }]}>AI estimate, not verified.</Text>
            {r.equipment.items.map((x) => (
              <View key={x.item} style={{ gap: 2 }}>
                <Text style={type.bodyStrong}>{x.item}</Text>
                {x.why ? <Text style={type.meta}>{x.why}</Text> : null}
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space[2] }}>
                  {x.where.map((w) => <Pressable key={w} accessibilityRole="link" onPress={() => search(`${x.item} ${w}`)} style={{ paddingHorizontal: 10, minHeight: 32, justifyContent: 'center', borderRadius: radius.full, borderWidth: 1, borderColor: color.violetLine }}><Text style={type.meta}>{w}</Text></Pressable>)}
                </View>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
      <View style={{ flexDirection: 'row', gap: space[3], padding: space[4], borderTopWidth: 1, borderTopColor: color.track }}>
        <Button style={{ flex: 1 }} tone="ghost" label="Back" onPress={() => go('ideas')} />
        <Button style={{ flex: 1 }} label="Share report" onPress={() => Share.share({ message: asText(r, r.title || idea.title) })} />
      </View>
    </View>
  );
}
