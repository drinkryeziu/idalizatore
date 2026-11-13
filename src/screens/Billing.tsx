import { useEffect, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { router } from 'expo-router';
import { Screen, TopBar } from '../components/chrome';
import { Icon } from '../components/Icon';
import { FootNote, H3, Lead, OptionCard, PageTitle, Panel, ResAct } from '../components/ui';
import { color, font, radius, space, typo } from '../theme';
import { useApp } from '../store';
import { fetchPlan } from '../api';
import { PLANS, PlanId, money, planOf } from '../plans';

const Feats = ({ items }: { items: string[] }) => (
  <View style={{ gap: 6, marginTop: space[2] }}>
    {items.map((f) => <View key={f} style={{ flexDirection: 'row', alignItems: 'flex-start', gap: space[2] }}><View style={{ marginTop: 2 }}><Icon name="check" size={16} color={color.violet} /></View><Text style={[typo.body14, { flex: 1, color: color.ink }]}>{f}</Text></View>)}
  </View>
);

/** Current plan and usage, and a plan chooser. Payments are not connected yet (Stripe or In-App Purchase is still to be decided). */
export function Billing() {
  const say = useApp((s) => s.say);
  const [cur, setCur] = useState<{ plan: PlanId; used: number; limit: number | null }>({ plan: 'free', used: 0, limit: 10 });
  const [choose, setChoose] = useState<{ plan: PlanId; period: 'month' | 'year' } | null>(null);
  useEffect(() => { fetchPlan().then(setCur).catch(() => {}); }, []);
  const plan = planOf(cur.plan);
  const pct = cur.limit ? Math.min(100, Math.round((cur.used / cur.limit) * 100)) : 100;
  // Plan & billing belongs to Settings: Back from the chooser returns to the overview, Back from the overview returns to Settings.
  const back = () => (choose ? setChoose(null) : router.replace('/settings'));

  return (
    <Screen tone="paper">
      <TopBar onBack={back} />
      <ScrollView style={{ flex: 1, marginHorizontal: -space[4] }} contentContainerStyle={{ paddingHorizontal: space[4], paddingBottom: space[6] }}>
        {!choose ? (
          <>
            <PageTitle>Plan & billing</PageTitle>
            <Panel tint>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: space[3] }}>
                <Text style={{ fontFamily: font.semi, fontSize: 32, lineHeight: 38, color: color.ink }}>{plan.name}</Text>
                <View style={{ paddingHorizontal: 10, borderWidth: 1, borderRadius: radius.full, borderColor: cur.plan === 'free' ? color.violetLine : color.successFill, backgroundColor: color.paper }}>
                  <Text style={[typo.label13m, { lineHeight: 24, color: cur.plan === 'free' ? color.inkSoft : color.success }]}>{cur.plan === 'free' ? 'Free plan' : 'Active'}</Text>
                </View>
              </View>
              <Text style={[typo.body15, { color: color.inkSoft, marginTop: 2, marginBottom: space[3] }]}>{cur.plan === 'free' ? 'No payment needed.' : `${money(plan.month)} a month`}</Text>
              <View style={{ marginBottom: space[3] }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: space[2], marginBottom: 6 }}>
                  <Text style={[typo.body14, { color: color.ink }]}>Analyzed ideas this month</Text>
                  <Text style={[typo.body14m, { color: color.ink }]}>{cur.limit ? `${cur.used} of ${cur.limit}` : `${cur.used} · unlimited`}</Text>
                </View>
                <View style={{ height: 6, borderRadius: radius.full, backgroundColor: color.paper, overflow: 'hidden' }}>
                  <View style={{ width: `${pct}%`, height: 6, borderRadius: radius.full, backgroundColor: cur.limit && pct >= 100 ? color.dangerFill : cur.limit ? color.successFill : color.violet }} />
                </View>
              </View>
              <Feats items={plan.feats} />
              <View style={{ flexDirection: 'row', marginTop: space[3] }}>
                <ResAct primary height={44} label={cur.plan === 'free' ? 'Upgrade' : 'Change plan'} onPress={() => setChoose({ plan: cur.plan === 'free' ? 'pro' : cur.plan, period: 'year' })} />
              </View>
            </Panel>
            <Panel>
              <H3>Billing history</H3>
              <Lead style={{ marginBottom: 0 }}>No payments yet. Receipts appear here after you upgrade.</Lead>
            </Panel>
            <FootNote>Plans and prices are samples. Payments are not connected yet, so nothing can be bought here.</FootNote>
          </>
        ) : (
          <>
            <PageTitle>Choose a plan</PageTitle>
            <View accessibilityRole="radiogroup" style={{ flexDirection: 'row', padding: 4, marginTop: space[3], marginBottom: space[3], borderWidth: 1, borderColor: color.violetLine, borderRadius: radius.full, backgroundColor: color.violetTint }}>
              {(['month', 'year'] as const).map((pd) => {
                const on = choose.period === pd;
                return (
                  <Pressable key={pd} accessibilityRole="radio" accessibilityState={{ selected: on }} onPress={() => setChoose({ ...choose, period: pd })}
                    style={{ flex: 1, height: 38, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, borderRadius: radius.full, backgroundColor: on ? color.violet : 'transparent' }}>
                    <Text style={[typo.body14m, { color: on ? color.paper : color.violetDeep }]}>{pd === 'month' ? 'Monthly' : 'Yearly'}</Text>
                    {pd === 'year' ? <View style={{ paddingHorizontal: 6, borderRadius: radius.full, backgroundColor: color.paper }}><Text style={[typo.tag11, { color: color.violetDeep }]}>Save 20%</Text></View> : null}
                  </Pressable>
                );
              })}
            </View>
            <View style={{ gap: space[2] }}>
              {PLANS.map((pl) => (
                <OptionCard key={pl.id} selected={choose.plan === pl.id} onPress={() => setChoose({ ...choose, plan: pl.id })} title={pl.name} tag={pl.tag}>
                  <Text style={{ fontFamily: font.semi, fontSize: 24, lineHeight: 30, color: color.ink }}>
                    {pl.id === 'free' ? '$0' : money(choose.period === 'year' ? pl.year / 12 : pl.month)}
                    {pl.id === 'free' ? '' : <Text style={[typo.meta13, { color: color.inkSoft }]}>{` a month${choose.period === 'year' ? ` · billed ${money(pl.year)} a year` : ''}`}</Text>}
                  </Text>
                  <Feats items={pl.feats} />
                </OptionCard>
              ))}
            </View>
            <View style={{ flexDirection: 'row', gap: space[3], marginTop: space[4] }}>
              <ResAct label="Not now" onPress={() => setChoose(null)} style={{ flex: 1 }} />
              <ResAct primary label="Continue" style={{ flex: 1 }} onPress={() => say(choose.plan === cur.plan ? 'That is already your plan.' : 'Payments aren’t connected yet, so plans can’t be bought here.', choose.plan !== cur.plan)} />
            </View>
          </>
        )}
      </ScrollView>
    </Screen>
  );
}
