import { useRef } from 'react';
import { Linking, Platform, Pressable, ScrollView, Text, View } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import * as Print from 'expo-print';
import { router, useLocalSearchParams } from 'expo-router';
import Svg, { Path } from 'react-native-svg';
import { Screen, TopBar } from '../components/chrome';
import { Icon } from '../components/Icon';
import { H3, PageTitle, Panel, ResAct, Star } from '../components/ui';
import { bandFill, color, font, radius, scoreBand, space, typo } from '../theme';
import { useApp } from '../store';
import { verdictFor } from '../lib/format';
import type { Block, Report } from '../ai/types';

const find = (q: string) => Linking.openURL('https://www.google.com/search?q=' + encodeURIComponent(q));
const RTL = ['ar', 'he', 'fa', 'ur'];
const TONES = [color.violetDeep, color.violet, '#d477ea', '#e7b3f2', '#c9c2cc'];
const ARC = Math.PI * 80;

function reportText(r: Report, title: string) {
  const out = [title, `Forecasted success rate: ${r.score}%`, ''];
  r.sections.forEach((s, n) => {
    out.push(`${n + 1}. ${s.title}`);
    s.blocks.forEach((b) => out.push(b.kind === 'list' ? b.items.map((i) => '- ' + i).join('\n') : b.text));
    out.push('');
  });
  return out.join('\n').trim();
}
const esc = (t: string) => t.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]!));
function reportHtml(r: Report, title: string) {
  const body = r.sections.map((s, n) => `<h2>${n + 1}. ${esc(s.title)}</h2>` + s.blocks.map((b) => (b.kind === 'list' ? '<ul>' + b.items.map((i) => `<li>${esc(i)}</li>`).join('') + '</ul>' : `<p>${b.kind === 'lead' ? '<b>' : ''}${esc(b.text)}${b.kind === 'lead' ? '</b>' : ''}</p>`)).join('')).join('');
  const dir = RTL.includes((r.lang || '').slice(0, 2)) ? 'rtl' : 'ltr';
  return `<html dir="${dir}"><body style="font-family:-apple-system,Helvetica;padding:32px;color:#252525"><h1 style="color:#7d0099">${esc(title)}</h1><h3>Forecasted success rate: ${r.score}% ${esc(r.verdict ?? '')}</h3><p><i>AI estimate, not a promise.</i></p>${body}</body></html>`;
}
/** expo-print ignores its html argument on the web (it prints the page), so the web opens the report in its own window. */
function printHtml(html: string) {
  if (Platform.OS === 'web') { const w = window.open('', '_blank'); if (!w) return; w.document.write(html); w.document.close(); w.focus(); w.print(); return; }
  Print.printAsync({ html });
}

/** Records where a section starts, so the chips can scroll to it. */
function Anchor({ k, onPos, children }: { k: string; onPos: (k: string, y: number) => void; children: React.ReactNode }) {
  return <View onLayout={(e) => onPos(k, e.nativeEvent.layout.y)}>{children}</View>;
}

function Dial({ value, band }: { value: number; band: 'good' | 'medium' | 'bad' }) {
  const d = 'M12 92A80 80 0 0 1 172 92';
  return (
    <View accessibilityRole="image" accessibilityLabel={`${value}%`} style={{ width: 184, height: 100 }}>
      <Svg width={184} height={100} viewBox="0 0 184 100">
        <Path d={d} fill="none" stroke={color.paper} strokeWidth={14} strokeLinecap="round" />
        {value > 0 ? <Path d={d} fill="none" stroke={bandFill[band]} strokeWidth={14} strokeLinecap="round" strokeDasharray={`${(value / 100) * ARC} ${ARC}`} /> : null}
      </Svg>
      <View style={{ position: 'absolute', left: 0, right: 0, bottom: -6, flexDirection: 'row', justifyContent: 'center', alignItems: 'baseline' }}>
        <Text style={{ fontFamily: font.semi, fontSize: 56, lineHeight: 60, color: color.ink, fontVariant: ['tabular-nums'] }}>{value}</Text>
        <Text style={{ fontFamily: font.medium, fontSize: 24, color: color.inkSoft, marginLeft: 2 }}>%</Text>
      </View>
    </View>
  );
}

function Bars({ items, max, format }: { items: { label: string; value: number }[]; max?: number; format?: (v: number) => string }) {
  const m = max || Math.max(...items.map((x) => x.value)) || 1;
  return (
    <View style={{ gap: space[3] }}>
      {items.map((x) => (
        <View key={x.label} style={{ gap: 4 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: space[3] }}>
            <Text style={[typo.body14, { flex: 1, color: color.ink }]}>{x.label}</Text>
            <Text style={[typo.body14m, { color: color.ink, fontVariant: ['tabular-nums'] }]}>{format ? format(x.value) : x.value}</Text>
          </View>
          <View style={{ height: 8, borderRadius: radius.full, backgroundColor: color.field, overflow: 'hidden' }}><View style={{ width: `${Math.max(2, (x.value / m) * 100)}%`, height: 8, borderRadius: radius.full, backgroundColor: color.violet }} /></View>
        </View>
      ))}
    </View>
  );
}
function Share({ items }: { items: { label: string; value: number }[] }) {
  const total = items.reduce((t, x) => t + x.value, 0) || 1;
  return (
    <View>
      <View style={{ flexDirection: 'row', gap: 2, height: 12, marginBottom: space[3], borderRadius: radius.full, overflow: 'hidden' }}>
        {items.map((x, k) => <View key={x.label} style={{ width: `${(x.value / total) * 100}%`, backgroundColor: TONES[k % 5] }} />)}
      </View>
      <View style={{ gap: space[2] }}>
        {items.map((x, k) => (
          <View key={x.label} style={{ flexDirection: 'row', alignItems: 'center', gap: space[2] }}>
            <View style={{ width: 10, height: 10, borderRadius: 3, backgroundColor: TONES[k % 5] }} />
            <Text style={[typo.body14, { flex: 1, color: color.ink }]}>{x.label}</Text>
            <Text style={[typo.body14m, { color: color.ink }]}>{Math.round((x.value / total) * 100)}%</Text>
          </View>
        ))}
      </View>
    </View>
  );
}
const fmtUnit = (unit: string) => (v: number) => {
  const n = Math.abs(v) >= 1000 ? Math.round(v).toLocaleString() : String(Math.round(v * 10) / 10);
  return /^[$€£¥]/.test(unit) ? unit + n : n + (unit ? (unit === '%' ? '' : ' ') + unit : '');
};
const Tag = ({ children }: { children: string }) => <View style={{ paddingHorizontal: 8, borderWidth: 1, borderColor: color.violetLine, borderRadius: radius.full }}><Text style={[typo.tag11, { color: color.inkSoft }]}>{children}</Text></View>;

function Blocks({ blocks, rtl }: { blocks: Block[]; rtl: boolean }) {
  const dir = { writingDirection: rtl ? 'rtl' : 'ltr' } as const;
  return (
    <View>
      {blocks.map((b, k) => {
        const prev = blocks[k - 1];
        const mt = k === 0 || b.kind === 'list' || prev?.kind === 'lead' ? 0 : space[4];
        if (b.kind === 'list') return <View key={k}>{b.items.map((it, m) => <View key={m} style={{ paddingLeft: rtl ? 0 : 28, paddingRight: rtl ? 28 : 0 }}><Text style={{ position: 'absolute', left: rtl ? undefined : 12, right: rtl ? 12 : undefined, fontFamily: font.bold, fontSize: 16, lineHeight: 24, color: color.ink }}>·</Text><Text style={[typo.body16, dir, { color: color.ink }]}>{it}</Text></View>)}</View>;
        return <Text key={k} style={[b.kind === 'lead' ? typo.body16m : typo.body16, dir, { color: color.ink, marginTop: mt }]}>{b.text}</Text>;
      })}
    </View>
  );
}

export function Result() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { ideas, go, say, setTarget, setOpenId } = useApp();
  const idea = ideas.find((i) => i.id === id);
  const r = idea?.report;
  const scroll = useRef<any>(null); // RN 0.88 does not export the ScrollView instance type
  const pos = useRef<Record<string, number>>({});
  const back = () => (router.canGoBack() ? router.back() : go('ideas'));
  if (!idea || !r) {
    return <Screen tone="paper"><TopBar onBack={back} /><Text style={[typo.body16, { marginTop: space[6], textAlign: 'center', color: color.inkSoft }]}>That report isn’t available.</Text></Screen>;
  }
  const band = scoreBand(r.score), rtl = RTL.includes((r.lang || '').slice(0, 2));
  const verdict = r.verdict || verdictFor(band), caption = r.caption || 'The forecasted success rate.';
  const hasSim = !!r.similar?.items.length, hasEq = !!r.equipment?.items.length;
  const simTitle = r.similar?.title || 'Similar ideas & companies', eqTitle = r.equipment?.title || 'Equipment & where to buy';
  const setPos = (k: string, y: number) => { pos.current[k] = y; };
  const goTo = (key: string) => scroll.current?.scrollTo({ y: Math.max(0, (pos.current[key] ?? 0) - 52), animated: true });
  const chips = [...r.sections.map((s, n) => ({ key: String(n), label: s.title })), ...(hasSim ? [{ key: 'sim', label: simTitle }] : []), ...(hasEq ? [{ key: 'eq', label: eqTitle }] : [])];
  const nav = (
    <View key="nav" style={{ marginHorizontal: -space[4], backgroundColor: color.paper }}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: space[2], paddingHorizontal: space[4], paddingVertical: space[2] }}>
        {chips.map((c) => <Pressable key={c.key} accessibilityRole="button" onPress={() => goTo(c.key)} style={{ height: 34, paddingHorizontal: 14, justifyContent: 'center', borderWidth: 1, borderColor: color.violetLine, borderRadius: radius.full, backgroundColor: color.violetTint }}><Text style={[typo.body14m, { color: color.violetDeep }]}>{c.label}</Text></Pressable>)}
      </ScrollView>
    </View>
  );
  const head = [
    <PageTitle key="t">Result</PageTitle>,
    <Text key="n" accessibilityRole="header" style={[typo.titleMd, { color: color.violetDeep, marginTop: space[1], marginBottom: space[1], writingDirection: rtl ? 'rtl' : 'ltr' }]}>{idea.title}</Text>,
    <Panel key="s" tint style={{ alignItems: 'center', paddingTop: space[5] }}>
      <Dial value={r.score} band={band} />
      <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: space[3] }}><Text style={[typo.h3, { color: color.ink }]}>{verdict}</Text>{r.score > 80 ? <Star /> : null}</View>
      <Text style={[typo.meta13, { color: color.inkSoft }]}>{caption}</Text>
    </Panel>,
    ...(r.factors.length ? [<Panel key="f"><H3>What drives the score</H3><Bars items={r.factors.map((f) => ({ label: f.label, value: f.score }))} max={100} /></Panel>] : []),
  ];
  const mailBody = reportText(r, idea.title);

  return (
    <Screen tone="paper">
      <TopBar onBack={back} micLabel="Record more about this idea" onMic={() => { setTarget(idea.id); setOpenId(idea.id); go('ideas'); say(`Hold the mic below to add to ${idea.title}.`); }} />
      <ScrollView ref={scroll} style={{ flex: 1, marginHorizontal: -space[4] }} stickyHeaderIndices={[head.length]} contentContainerStyle={{ paddingHorizontal: space[4], paddingBottom: space[6] }}>
        {head}
        {nav}
        {r.sections.map((sec, n) => {
          const ch = r.chart && r.chart.section === n + 1 ? r.chart : null;
          return (
            <Panel key={n} style={{ marginTop: space[2] }}>
              <Anchor k={String(n)} onPos={setPos}>
                <Text accessibilityRole="header" style={[typo.h3, { color: color.violetDeep, marginBottom: space[3], writingDirection: rtl ? 'rtl' : 'ltr' }]}>{n + 1}. {sec.title}</Text>
                <Blocks blocks={sec.blocks} rtl={rtl} />
                {ch ? (
                  <View style={{ marginTop: space[4], paddingTop: space[4], borderTopWidth: 1, borderTopColor: color.violetLine }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: space[2], marginBottom: space[3] }}><Text style={[typo.body15m, { flex: 1, color: color.ink }]}>{ch.title}</Text><Tag>AI estimate</Tag></View>
                    {ch.kind === 'bars' ? <Bars items={ch.items} format={fmtUnit(ch.unit)} /> : <Share items={ch.items} />}
                  </View>
                ) : null}
              </Anchor>
            </Panel>
          );
        })}
        {hasSim ? (
          <Panel style={{ marginTop: space[2] }}>
            <Anchor k="sim" onPos={setPos}>
              <H3>{simTitle}</H3>
              {r.similar!.items.map((x, k) => (
                <Pressable key={k} accessibilityRole="link" accessibilityLabel={`${x.name}: search the web`} onPress={() => find(x.name + (x.kind ? ' ' + x.kind : ''))}
                  style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: space[3], paddingVertical: space[3], borderTopWidth: k ? 1 : 0, borderTopColor: color.violetLine }}>
                  <View style={{ flex: 1, gap: 2 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: space[2], flexWrap: 'wrap' }}><Text style={[typo.body15m, { color: color.ink }]}>{x.name}</Text>{x.kind ? <Tag>{x.kind}</Tag> : null}</View>
                    {x.note ? <Text style={[typo.body14, { color: color.inkSoft }]}>{x.note}</Text> : null}
                  </View>
                  <Icon name="external" size={16} color={color.violet} />
                </Pressable>
              ))}
              <Text style={[typo.small12, { lineHeight: 17, color: color.inkSoft, marginTop: space[2] }]}>From the AI’s own knowledge, so check each one before relying on it. Tap to search the web.</Text>
            </Anchor>
          </Panel>
        ) : null}
        {hasEq ? (
          <Panel style={{ marginTop: space[2] }}>
            <Anchor k="eq" onPos={setPos}>
              <H3>{eqTitle}</H3>
              {r.equipment!.items.map((x, k) => (
                <View key={k} style={{ gap: 2, paddingVertical: space[3], borderTopWidth: k ? 1 : 0, borderTopColor: color.violetLine }}>
                  <Text style={[typo.body15m, { color: color.ink }]}>{x.item}</Text>
                  {x.why ? <Text style={[typo.body14, { color: color.inkSoft }]}>{x.why}</Text> : null}
                  {x.where.length ? (
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space[2], marginTop: space[2] }}>
                      {x.where.map((w) => (
                        <Pressable key={w} accessibilityRole="link" onPress={() => find(`${x.item} ${w}`)} style={{ height: 32, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', gap: 4, borderWidth: 1, borderColor: color.violetLine, borderRadius: radius.full, backgroundColor: color.violetTint }}>
                          <Text style={[typo.body14m, { color: color.violetDeep }]}>{w}</Text><Icon name="external" size={16} color={color.violetDeep} />
                        </Pressable>
                      ))}
                    </View>
                  ) : null}
                </View>
              ))}
              <Text style={[typo.small12, { lineHeight: 17, color: color.inkSoft, marginTop: space[2] }]}>Suggested stores only; prices and stock aren’t checked. Tap a store to search it.</Text>
            </Anchor>
          </Panel>
        ) : null}
      </ScrollView>
      <View style={{ flexDirection: 'row', gap: space[3], marginHorizontal: -space[4], marginBottom: -space[4], paddingHorizontal: space[4], paddingTop: space[3], paddingBottom: space[4], borderTopWidth: 1, borderTopColor: color.track, backgroundColor: color.paper }}>
        <ResAct primary icon="mail" label="Email" style={{ flex: 1 }} onPress={async () => {
          await Clipboard.setStringAsync(mailBody).catch(() => {}); // mail bodies are length-limited, so the full text is also copied
          Linking.openURL(`mailto:?subject=${encodeURIComponent('Idealizator report: ' + idea.title)}&body=${encodeURIComponent(mailBody.slice(0, 1500))}`);
          say('Opening your mail app. The report is also copied, in case it doesn’t open.');
        }} />
        <ResAct icon="printer" label="Print" style={{ flex: 1 }} onPress={() => printHtml(reportHtml(r, idea.title))} />
      </View>
    </Screen>
  );
}
