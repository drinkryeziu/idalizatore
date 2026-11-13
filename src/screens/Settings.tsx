import { useEffect, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { router } from 'expo-router';
import { Screen, TopBar } from '../components/chrome';
import { Icon, IconName } from '../components/Icon';
import { Avatar, Field, FootNote, H3, Lead, Meter, OptionCard, PageTitle, Panel, ResAct, SetRow, pwStrength } from '../components/ui';
import { color, radius, space, typo } from '../theme';
import { StorageChoice, useApp } from '../store';
import { changePassword, deleteAccount, fetchPlan, logout, saveStorageChoice, updateAccount } from '../api';
import { confirmAsync } from '../dialog';
import { exportIdeas } from '../lib/export';
import { planOf } from '../plans';
import { Legal } from './Legal';
import { LegalDoc, PRIVACY, TERMS } from '../legal';

export const STORAGE_OPTS: { id: StorageChoice; icon: IconName; title: string; text: string; tag?: string }[] = [
  { id: 'device', icon: 'phone', title: 'On this iPhone', text: 'Stays on your phone. Private and works offline, but is lost if you delete the app or change phones.' },
  { id: 'server', icon: 'cloud', title: 'On our server', text: 'Backed up to your account, so you can open your ideas on any device. Needs an internet connection.' },
  { id: 'both', icon: 'layers', title: 'Both', tag: 'Recommended', text: 'Saved on your phone and backed up to your account. Works offline and syncs when you are back online.' },
];
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function Settings() {
  const user = useApp((s) => s.user);
  const say = useApp((s) => s.say);
  const [legal, setLegal] = useState<LegalDoc | null>(null);
  const [plan, setPlan] = useState<'free' | 'plus' | 'pro'>('free');
  const [acc, setAcc] = useState<{ name: string; email: string } | null>(null);
  const [pw, setPw] = useState<{ cur: string; nw: string; conf: string; show: boolean } | null>(null);
  const [del, setDel] = useState<{ pw: string; err: string } | null>(null);
  const [busy, setBusy] = useState(false);
  useEffect(() => { fetchPlan().then((p) => setPlan(p.plan)).catch(() => {}); }, []);
  const previous = () => (router.canGoBack() ? router.back() : router.navigate('/'));
  if (!user) return null;
  if (legal) return <Legal doc={legal} onBack={() => setLegal(null)} />;

  const note = user.storage === 'device' ? 'Your ideas are saved only on this iPhone.' : user.storage === 'server' ? 'Your ideas are saved on our server, under your account.' : 'Your ideas are saved on this iPhone and backed up to your account.';
  const accErr = acc ? (!acc.name.trim() ? 'Enter your name.' : !EMAIL.test(acc.email.trim()) ? 'Enter a valid email address.' : '') : '';
  const st = pw ? pwStrength(pw.nw) : 0;
  const pwErr = pw ? (!pw.cur ? 'Enter your current password.' : pw.nw.length < 8 ? 'Use at least 8 characters.' : !/\d/.test(pw.nw) ? 'Include at least one number.' : pw.nw === pw.cur ? 'Choose a password you have not used here.' : pw.conf !== pw.nw ? 'The two new passwords do not match.' : '') : '';

  async function chooseStorage(id: StorageChoice) {
    if (id === user!.storage) return;
    await saveStorageChoice(id);
    say(id === 'device' ? 'Ideas will be kept on this iPhone only.' : id === 'server' ? 'Ideas will be kept on our server.' : 'Ideas will be kept on this iPhone and backed up to your account.');
  }
  async function saveAcc() {
    if (!acc || accErr) return;
    setBusy(true);
    try { const r = await updateAccount(acc.name.trim(), acc.email.trim()); setAcc(null); say(r === 'confirm-email' ? `Details saved. Open the link we sent to ${acc.email.trim()} to confirm the new email.` : 'Account details saved.'); }
    catch (e: any) { say(e.message, true); } finally { setBusy(false); }
  }
  async function savePw() {
    if (!pw || pwErr) return;
    setBusy(true);
    try { await changePassword(pw.cur, pw.nw); setPw(null); say('Password updated.'); } catch (e: any) { say(e.message, true); } finally { setBusy(false); }
  }
  async function signOut() {
    const ok = await confirmAsync('Sign out?', user!.storage === 'device' ? 'Your ideas stay on this iPhone and come back when you sign in again.' : 'Your ideas are backed up to your account and come back when you sign in.', 'Sign out');
    if (ok) { await logout(); say('You’re signed out.'); }
  }
  async function removeAccount() {
    if (!del) return;
    const ok = await confirmAsync('Delete your account?', 'This removes your profile and all your ideas from our server and from this device. It cannot be undone.', 'Delete');
    if (!ok) return;
    try { await deleteAccount(del.pw); } catch (e: any) { setDel({ ...del, err: e.message }); }
  }

  return (
    <Screen tone="paper">
      <TopBar onBack={previous} onClose={previous} />
      <ScrollView style={{ flex: 1, marginHorizontal: -space[4] }} contentContainerStyle={{ paddingHorizontal: space[4], paddingBottom: space[6] }} keyboardShouldPersistTaps="handled">
        <PageTitle>Settings</PageTitle>

        <Panel>
          <H3>Where to save your ideas</H3>
          <Lead>Choose where your recordings and reports are kept.</Lead>
          <View accessibilityRole="radiogroup" style={{ gap: space[2] }}>
            {STORAGE_OPTS.map((o) => <OptionCard key={o.id} selected={user.storage === o.id} onPress={() => chooseStorage(o.id)} icon={o.icon} title={o.title} tag={o.tag} text={o.text} />)}
          </View>
          <Text accessibilityLiveRegion="polite" style={[typo.meta13, { color: color.violetDeep, marginTop: space[3] }]}>{note}</Text>
        </Panel>

        <Panel>
          <H3>Account</H3>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: space[3], marginBottom: space[3] }}>
            <Avatar name={user.name} size={56} />
            <View style={{ flex: 1 }}>
              <Text style={[typo.h3, { color: color.ink }]}>{user.name}</Text>
              <Text numberOfLines={1} style={[typo.body14, { color: color.inkSoft }]}>{user.email}</Text>
            </View>
          </View>
          <Pressable accessibilityRole="button" onPress={() => router.navigate('/billing')}
            style={{ flexDirection: 'row', alignItems: 'center', gap: space[3], padding: space[3], marginBottom: space[2], borderWidth: 1, borderColor: color.violet, borderRadius: 14, backgroundColor: color.violetTint }}>
            <View style={{ width: 40, height: 40, borderRadius: radius.full, backgroundColor: color.violetTint, alignItems: 'center', justifyContent: 'center' }}><Icon name="card" size={22} color={color.violetDeep} /></View>
            <View style={{ flex: 1, gap: 2 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: space[2] }}>
                <Text style={[typo.body16m, { lineHeight: 22, color: color.violetDeep }]}>Plan & billing</Text>
                <View style={{ paddingHorizontal: 8, borderWidth: 1, borderRadius: radius.full, borderColor: plan === 'free' ? color.violetLine : color.violet, backgroundColor: color.paper }}><Text style={[typo.tag11, { color: plan === 'free' ? color.inkSoft : color.violetDeep }]}>{planOf(plan).name}</Text></View>
              </View>
              <Text style={[typo.meta13, { color: color.inkSoft }]}>{plan === 'free' ? 'Upgrade for more analyzed ideas and backup.' : 'See your plan and usage.'}</Text>
            </View>
            <Icon name="right" size={20} color={color.violetDeep} />
          </Pressable>
          {acc ? (
            <View style={{ gap: space[3] }}>
              <Field label="Name" value={acc.name} onChangeText={(v) => setAcc({ ...acc, name: v })} autoComplete="name" />
              <Field label="Email" value={acc.email} onChangeText={(v) => setAcc({ ...acc, email: v })} autoCapitalize="none" keyboardType="email-address" autoComplete="email" />
              {accErr ? <Text accessibilityRole="alert" style={[typo.meta13, { color: color.danger }]}>{accErr}</Text> : null}
              <View style={{ flexDirection: 'row', gap: space[3] }}>
                <ResAct label="Cancel" height={44} onPress={() => setAcc(null)} style={{ flex: 1 }} />
                <ResAct primary label="Save" height={44} disabled={!!accErr || busy} onPress={saveAcc} style={{ flex: 1 }} />
              </View>
            </View>
          ) : <SetRow label="Edit account details" onPress={() => setAcc({ name: user.name, email: user.email })} />}
        </Panel>

        <Panel>
          <H3>Password</H3>
          {pw ? (
            <View style={{ gap: space[3] }}>
              <Field label="Current password" value={pw.cur} onChangeText={(v) => setPw({ ...pw, cur: v })} password show={pw.show} onToggleShow={() => setPw({ ...pw, show: !pw.show })} autoComplete="current-password" />
              <Field label="New password" value={pw.nw} onChangeText={(v) => setPw({ ...pw, nw: v })} password show={pw.show} onToggleShow={() => setPw({ ...pw, show: !pw.show })} autoComplete="new-password" />
              <Meter value={st} />
              <Field label="Repeat new password" value={pw.conf} onChangeText={(v) => setPw({ ...pw, conf: v })} password show={pw.show} onToggleShow={() => setPw({ ...pw, show: !pw.show })} autoComplete="new-password" />
              {pw.cur || pw.nw || pw.conf ? (pwErr
                ? <Text accessibilityRole="alert" style={[typo.meta13, { color: color.danger }]}>{pwErr}</Text>
                : <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}><Icon name="check" size={16} color={color.success} /><Text style={[typo.meta13, { color: color.success }]}>Looks good.</Text></View>) : null}
              <View style={{ flexDirection: 'row', gap: space[3] }}>
                <ResAct label="Cancel" height={44} onPress={() => setPw(null)} style={{ flex: 1 }} />
                <ResAct primary label="Update password" height={44} disabled={!!pwErr || busy} onPress={savePw} style={{ flex: 1 }} />
              </View>
            </View>
          ) : <SetRow icon="lock" label="Change password" onPress={() => setPw({ cur: '', nw: '', conf: '', show: false })} />}
        </Panel>

        <Panel>
          <H3>Your data</H3>
          <SetRow icon="down" label="Export my ideas" onPress={() => exportIdeas(useApp.getState().ideas).then(() => say('Saved your ideas as a file.')).catch(() => say('Couldn’t save the file here.'))} />
          <SetRow icon="list" label="Terms of Use" onPress={() => setLegal(TERMS)} />
          <SetRow icon="lock" label="Privacy Policy" onPress={() => setLegal(PRIVACY)} />
          <SetRow icon="out" label="Sign out" out onPress={signOut} />
          {del ? (
            <View style={{ gap: space[3], marginTop: space[3] }}>
              <Text style={[typo.meta13, { color: color.inkSoft }]}>Removes your profile and all your ideas from our server and from this device. Your sign-in email stays in the shared login system; ask support to remove it too.</Text>
              <Field label="Enter your password to confirm" value={del.pw} onChangeText={(v) => setDel({ pw: v, err: '' })} error={del.err} password show={false} />
              <View style={{ flexDirection: 'row', gap: space[3] }}>
                <ResAct label="Cancel" height={44} onPress={() => setDel(null)} style={{ flex: 1 }} />
                <ResAct danger label="Delete account" height={44} disabled={!del.pw} onPress={removeAccount} style={{ flex: 1 }} />
              </View>
            </View>
          ) : <SetRow icon="x" label="Delete account" out onPress={() => setDel({ pw: '', err: '' })} />}
        </Panel>
        <FootNote>Ideas typed or spoken in any language are analyzed in that language.</FootNote>
      </ScrollView>
    </Screen>
  );
}
