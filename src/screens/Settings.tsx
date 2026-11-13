import { useState } from 'react';
import { Alert, Pressable, ScrollView, Text, View } from 'react-native';
import { Icon, IconName } from '../components/Icon';
import { Button, Field, PageTitle } from '../components/ui';
import { color, radius, space, type } from '../theme';
import { StorageChoice, useApp } from '../store';
import { changePassword, deleteAccount, logout, refreshMe, resendVerification, saveStorageChoice } from '../api';

const OPTS: { id: StorageChoice; icon: IconName; title: string; text: string; tag?: string }[] = [
  { id: 'device', icon: 'phone', title: 'On this iPhone', text: 'Stays on your phone. Private and works offline, but is lost if you delete the app or change phones.' },
  { id: 'server', icon: 'cloud', title: 'On our server', text: 'Backed up to your account, so you can open your ideas on any device. Needs an internet connection.' },
  { id: 'both', icon: 'layers', title: 'Both', tag: 'Recommended', text: 'Saved on your phone and backed up to your account. Works offline and syncs when you are back online.' },
];

export function StorageOptions({ value, onChange }: { value: StorageChoice; onChange: (v: StorageChoice) => void }) {
  return (
    <View style={{ gap: space[2] }}>
      {OPTS.map((o) => {
        const on = o.id === value;
        return (
          <Pressable key={o.id} accessibilityRole="radio" accessibilityState={{ selected: on }} onPress={() => onChange(o.id)}
            style={{ flexDirection: 'row', gap: space[3], padding: space[3], borderWidth: 1, borderRadius: 14, borderColor: on ? color.violet : color.violetLine, backgroundColor: on ? color.violetTint : color.paper }}>
            <View style={{ width: 40, height: 40, borderRadius: radius.full, alignItems: 'center', justifyContent: 'center', backgroundColor: on ? color.violet : color.violetTint }}>
              <Icon name={o.icon} color={on ? color.paper : color.violetDeep} />
            </View>
            <View style={{ flex: 1, gap: 2 }}>
              <Text style={type.bodyStrong}>{o.title}{o.tag ? `  ·  ${o.tag}` : ''}</Text>
              <Text style={[type.meta, { color: color.inkSoft }]}>{o.text}</Text>
            </View>
          </Pressable>
        );
      })}
    </View>
  );
}

const H = ({ children }: { children: string }) => <Text style={[type.titleMd, { color: color.violetDeep }]}>{children}</Text>;

export function Settings() {
  const user = useApp((s) => s.user);
  const [cur, setCur] = useState(''), [next, setNext] = useState(''), [pwMsg, setPwMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [mailMsg, setMailMsg] = useState('');
  const [delPw, setDelPw] = useState(''), [delOpen, setDelOpen] = useState(false), [delErr, setDelErr] = useState('');
  if (!user) return null;

  async function change() {
    try { await changePassword(cur, next); setCur(''); setNext(''); setPwMsg({ ok: true, text: 'Password changed. Other devices were signed out.' }); }
    catch (e: any) { setPwMsg({ ok: false, text: e.message }); }
  }
  async function remove() {
    try { await deleteAccount(delPw); } catch (e: any) { setDelErr(e.message); }
  }
  function confirmSignOut() {
    const local = user!.storage === 'device';
    Alert.alert('Sign out?', local ? 'Your ideas stay on this iPhone and come back when you sign in again.' : 'Your ideas are backed up to your account and come back when you sign in.',
      [{ text: 'Cancel', style: 'cancel' }, { text: 'Sign out', onPress: () => logout() }]);
  }

  return (
    <ScrollView contentContainerStyle={{ padding: space[4], gap: space[4] }} keyboardShouldPersistTaps="handled">
      <PageTitle>Settings</PageTitle>

      {!user.verified && (
        <View style={{ padding: space[3], borderRadius: radius.lg, borderWidth: 1, borderColor: color.amber, gap: space[2] }}>
          <Text style={type.bodyStrong}>Confirm your email</Text>
          <Text style={[type.meta, { color: color.inkSoft }]}>Open the link we sent to {user.email}. Until then the AI features are locked.</Text>
          {mailMsg ? <Text style={type.meta}>{mailMsg}</Text> : null}
          <View style={{ flexDirection: 'row', gap: space[2] }}>
            <Button label="I confirmed" tone="ghost" onPress={() => refreshMe().then(() => setMailMsg('Checked.')).catch((e) => setMailMsg(e.message))} />
            <Button label="Resend email" tone="ghost" onPress={() => resendVerification().then(() => setMailMsg('Sent. Check your inbox.')).catch((e) => setMailMsg(e.message))} />
          </View>
        </View>
      )}

      <H>Where ideas are kept</H>
      <StorageOptions value={user.storage} onChange={saveStorageChoice} />

      <H>Account</H>
      <Text style={type.body}>{user.name}{'\n'}<Text style={{ color: color.inkSoft }}>{user.email}</Text></Text>

      <H>Change password</H>
      <Field label="Current password" value={cur} onChangeText={setCur} secureTextEntry autoComplete="current-password" />
      <Field label="New password" value={next} onChangeText={setNext} secureTextEntry autoComplete="new-password" hint="8+ characters with a number" />
      {pwMsg ? <Text accessibilityRole="alert" style={[type.meta, { color: pwMsg.ok ? color.success : color.danger }]}>{pwMsg.text}</Text> : null}
      <Button label="Change password" tone="ghost" disabled={!cur || !next} onPress={change} />

      <Button label="Sign out" tone="ghost" onPress={confirmSignOut} />

      <H>Delete account</H>
      <Text style={[type.meta, { color: color.inkSoft }]}>Removes your account and all your ideas from our server and from this iPhone. This cannot be undone.</Text>
      {delOpen ? (
        <>
          <Field label="Enter your password to confirm" value={delPw} onChangeText={setDelPw} secureTextEntry error={delErr} />
          <Button label="Delete my account permanently" disabled={!delPw} onPress={remove} style={{ backgroundColor: color.danger }} />
          <Button label="Cancel" tone="ghost" onPress={() => { setDelOpen(false); setDelPw(''); setDelErr(''); }} />
        </>
      ) : <Button label="Delete account" tone="ghost" onPress={() => setDelOpen(true)} />}
    </ScrollView>
  );
}
