import { useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button, Field } from '../components/ui';
import { color, space, type } from '../theme';
import { StorageChoice } from '../store';
import { forgotPassword, login, register, setNewPassword } from '../api';
import { StorageOptions } from './Settings';
import { Legal } from './Legal';
import { LegalDoc, PRIVACY, TERMS } from '../legal';

type Mode = 'welcome' | 'create' | 'signin' | 'storage' | 'forgot' | 'check';
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export function pwStrength(v: string) {
  let n = 0;
  if (v.length >= 8) n++; if (/[a-z]/.test(v) && /[A-Z]/.test(v)) n++; if (/\d/.test(v)) n++; if (/[^A-Za-z0-9]/.test(v) || v.length >= 12) n++;
  return v ? Math.max(1, n) : 0;
}
const pwProblem = (v: string) => (v.length < 8 ? 'Use at least 8 characters.' : !/\d/.test(v) ? 'Include at least one number.' : '');
const Strength = ({ v }: { v: string }) => ['Use 8+ characters with a number', 'Weak', 'Fair', 'Good', 'Strong'][pwStrength(v)];

export function AuthScreen() {
  const [mode, setMode] = useState<Mode>('welcome');
  const [name, setName] = useState(''), [email, setEmail] = useState(''), [pw, setPw] = useState(''), [pw2, setPw2] = useState('');
  const [storage, setStorage] = useState<StorageChoice>('both');
  const [err, setErr] = useState<Record<string, string>>({});
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);
  const [legal, setLegal] = useState<LegalDoc | null>(null);
  const [agree, setAgree] = useState(false);
  const [checkText, setCheckText] = useState('');

  const go = (m: Mode) => { setErr({}); setMsg(''); setMode(m); };
  async function run(fn: () => Promise<void>) {
    setBusy(true); setErr({});
    try { await fn(); } catch (e: any) { setErr({ form: e.message || 'Something went wrong. Try again.' }); } finally { setBusy(false); }
  }

  function validate(): boolean {
    const e: Record<string, string> = {};
    if (mode === 'create' && !name.trim()) e.name = 'Enter your name.';
    if (!EMAIL.test(email.trim())) e.email = 'Enter a valid email address.';
    if (mode === 'create') { const p = pwProblem(pw); if (p) e.pw = p; else if (pw !== pw2) e.pw2 = 'Passwords do not match.'; }
    if (mode === 'signin' && !pw) e.pw = 'Enter your password.';
    if (mode === 'create' && !agree) e.agree = 'Please agree to the Terms of Use and Privacy Policy to continue.';
    setErr(e);
    return !Object.keys(e).length;
  }

  function submit() {
    if (busy || !validate()) return;
    if (mode === 'create') return setMode('storage');
    if (mode === 'signin') return void run(() => login(email.trim(), pw));
    if (mode === 'forgot') return void run(async () => {
      await forgotPassword(email.trim());
      setCheckText(`If ${email.trim()} has an account, we sent a link to reset the password. Open it on this iPhone.`);
      setMode('check');
    });
  }

  if (legal) return <Legal doc={legal} onBack={() => setLegal(null)} />;

  if (mode === 'welcome') {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: color.violet, padding: space[4], justifyContent: 'space-between' }}>
        <View style={{ marginTop: space[16] }}>
          <Text style={[type.hero, { color: color.paper }]}>Speak your idea.{'\n'}Know if it can fly.</Text>
          <View style={{ marginTop: space[8], gap: space[3] }}>
            {['Talk, and the AI files and cleans up your idea', 'A market score, with the reasons behind it', 'A business plan and marketing plan in five sections'].map((t) => (
              <Text key={t} style={[type.body, { color: color.paper }]}>· {t}</Text>
            ))}
          </View>
        </View>
        <View style={{ gap: space[3] }}>
          <Button label="Create account" tone="light" onPress={() => go('create')} />
          <Button label="Sign in" tone="ghost" onPress={() => go('signin')} />
          <View style={{ flexDirection: 'row', justifyContent: 'center' }}>
            <Pressable accessibilityRole="link" onPress={() => setLegal(TERMS)} style={{ minHeight: 44, justifyContent: 'center', paddingHorizontal: space[3] }}><Text style={[type.meta, { color: color.paper, textDecorationLine: 'underline' }]}>Terms of Use</Text></Pressable>
            <Pressable accessibilityRole="link" onPress={() => setLegal(PRIVACY)} style={{ minHeight: 44, justifyContent: 'center', paddingHorizontal: space[3] }}><Text style={[type.meta, { color: color.paper, textDecorationLine: 'underline' }]}>Privacy Policy</Text></Pressable>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  const title = { create: 'Create account', signin: 'Sign in', storage: 'Where to keep ideas?', forgot: 'Reset password', check: 'Check your email' }[mode];
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: color.paper }}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={{ padding: space[4], gap: space[4] }} keyboardShouldPersistTaps="handled">
          <Text accessibilityRole="header" style={[type.titleLg, { color: color.violet }]}>{title}</Text>
          {msg ? <Text accessibilityLiveRegion="polite" style={[type.body, { color: color.success }]}>{msg}</Text> : null}
          {err.form ? <Text accessibilityRole="alert" style={[type.body, { color: color.danger }]}>{err.form}</Text> : null}

          {mode === 'check' ? (
            <>
              <Text style={type.body}>{checkText}</Text>
              <Button label="Back to sign in" onPress={() => go('signin')} />
            </>
          ) : mode === 'storage' ? (
            <>
              <StorageOptions value={storage} onChange={setStorage} />
              {busy ? <ActivityIndicator color={color.violet} /> : (
                <Button label="Create my account" onPress={() => run(async () => {
                  const r = await register(name.trim(), email.trim(), pw, storage);
                  if (r === 'confirm') { setCheckText(`We sent a link to ${email.trim()}. Open it on this iPhone to confirm your email, then sign in.`); setMode('check'); }
                })} />
              )}
              <Button label="Back" tone="ghost" onPress={() => go('create')} />
            </>
          ) : (
            <>
              {mode === 'create' && <Field label="Name" value={name} onChangeText={setName} error={err.name} autoComplete="name" />}
              <Field label="Email" value={email} onChangeText={setEmail} error={err.email} autoCapitalize="none" keyboardType="email-address" autoComplete="email" />
              {mode !== 'forgot' && (
                <Field label="Password" value={pw} onChangeText={setPw} error={err.pw} secureTextEntry
                  autoComplete={mode === 'signin' ? 'current-password' : 'new-password'} hint={mode === 'create' ? Strength({ v: pw }) : undefined} />
              )}
              {mode === 'create' && <Field label="Verify password" value={pw2} onChangeText={setPw2} error={err.pw2} secureTextEntry />}
              {mode === 'create' && (
                <View>
                  <Pressable accessibilityRole="checkbox" accessibilityState={{ checked: agree }} onPress={() => setAgree(!agree)} style={{ flexDirection: 'row', gap: space[3], alignItems: 'flex-start', minHeight: 44 }}>
                    <View style={{ width: 24, height: 24, marginTop: 2, borderRadius: 6, borderWidth: 2, borderColor: err.agree ? color.danger : color.violet, backgroundColor: agree ? color.violet : color.paper, alignItems: 'center', justifyContent: 'center' }}>
                      {agree ? <Text style={{ color: color.paper, fontSize: 16, lineHeight: 18 }}>✓</Text> : null}
                    </View>
                    <Text style={[type.body, { flex: 1, fontSize: 15 }]}>
                      I agree to the <Text style={{ color: color.violetDeep, textDecorationLine: 'underline' }} onPress={() => setLegal(TERMS)}>Terms of Use</Text> and the <Text style={{ color: color.violetDeep, textDecorationLine: 'underline' }} onPress={() => setLegal(PRIVACY)}>Privacy Policy</Text>.
                    </Text>
                  </Pressable>
                  {err.agree ? <Text accessibilityRole="alert" style={[type.meta, { color: color.danger }]}>{err.agree}</Text> : null}
                </View>
              )}
              {busy ? <ActivityIndicator color={color.violet} /> : (
                <Button label={{ create: 'Continue', signin: 'Sign in', forgot: 'Send reset link' }[mode as 'create']} onPress={submit} />
              )}
              {mode === 'signin' && <Pressable accessibilityRole="button" onPress={() => go('forgot')} style={{ minHeight: 44, justifyContent: 'center' }}><Text style={[type.body, { color: color.violetDeep, textAlign: 'center' }]}>Forgot password?</Text></Pressable>}
              <Button label="Back" tone="ghost" onPress={() => go('welcome')} />
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

/** Shown after the person opens the reset link in the email: pick a new password and continue signed in. */
export function NewPasswordScreen() {
  const [pw, setPw] = useState(''), [pw2, setPw2] = useState(''), [err, setErr] = useState(''), [busy, setBusy] = useState(false);
  async function save() {
    const p = pwProblem(pw);
    if (p) return setErr(p);
    if (pw !== pw2) return setErr('Passwords do not match.');
    setBusy(true); setErr('');
    try { await setNewPassword(pw); } catch (e: any) { setErr(e.message); } finally { setBusy(false); }
  }
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: color.paper }}>
      <ScrollView contentContainerStyle={{ padding: space[4], gap: space[4] }} keyboardShouldPersistTaps="handled">
        <Text accessibilityRole="header" style={[type.titleLg, { color: color.violet }]}>New password</Text>
        {err ? <Text accessibilityRole="alert" style={[type.body, { color: color.danger }]}>{err}</Text> : null}
        <Field label="New password" value={pw} onChangeText={setPw} secureTextEntry autoComplete="new-password" hint={Strength({ v: pw })} />
        <Field label="Verify password" value={pw2} onChangeText={setPw2} secureTextEntry />
        {busy ? <ActivityIndicator color={color.violet} /> : <Button label="Save password" onPress={save} />}
      </ScrollView>
    </SafeAreaView>
  );
}
