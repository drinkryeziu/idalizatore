import { useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button, Field } from '../components/ui';
import { color, space, type } from '../theme';
import { StorageChoice } from '../store';
import { forgotPassword, login, register, resetPassword } from '../api';
import { StorageOptions } from './Settings';

type Mode = 'welcome' | 'create' | 'signin' | 'storage' | 'forgot' | 'reset';
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export function pwStrength(v: string) {
  let n = 0;
  if (v.length >= 8) n++; if (/[a-z]/.test(v) && /[A-Z]/.test(v)) n++; if (/\d/.test(v)) n++; if (/[^A-Za-z0-9]/.test(v) || v.length >= 12) n++;
  return v ? Math.max(1, n) : 0;
}
// Same rule as the server: 8+ characters with a number.
const pwProblem = (v: string) => (v.length < 8 ? 'Use at least 8 characters.' : !/\d/.test(v) ? 'Include at least one number.' : '');

export function AuthScreen() {
  const [mode, setMode] = useState<Mode>('welcome');
  const [name, setName] = useState(''), [email, setEmail] = useState(''), [pw, setPw] = useState(''), [pw2, setPw2] = useState(''), [code, setCode] = useState('');
  const [storage, setStorage] = useState<StorageChoice>('both');
  const [err, setErr] = useState<Record<string, string>>({});
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);

  const go = (m: Mode) => { setErr({}); setMsg(''); setMode(m); };
  async function run(fn: () => Promise<void>) {
    setBusy(true);
    try { await fn(); } catch (e: any) { setErr({ form: e.message || 'Something went wrong. Try again.' }); } finally { setBusy(false); }
  }

  function validate(): boolean {
    const e: Record<string, string> = {};
    if (mode === 'create' && !name.trim()) e.name = 'Enter your name.';
    if (!EMAIL.test(email.trim())) e.email = 'Enter a valid email address.';
    if (mode === 'create' || mode === 'reset') { const p = pwProblem(pw); if (p) e.pw = p; else if (pw !== pw2) e.pw2 = 'Passwords do not match.'; }
    if (mode === 'signin' && !pw) e.pw = 'Enter your password.';
    if (mode === 'reset' && !code.trim()) e.code = 'Enter the code from the email.';
    setErr(e);
    return !Object.keys(e).length;
  }

  function submit() {
    if (busy || !validate()) return;
    if (mode === 'create') return setMode('storage');
    if (mode === 'signin') return void run(() => login(email.trim(), pw));
    if (mode === 'forgot') return void run(async () => { await forgotPassword(email.trim()); setMsg('If that email has an account, we sent a code. It works for 30 minutes.'); setMode('reset'); });
    if (mode === 'reset') return void run(async () => { await resetPassword(email.trim(), code.trim(), pw); setPw(''); setPw2(''); setCode(''); setMsg('Password changed. Sign in with your new password.'); setMode('signin'); });
  }

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
        </View>
      </SafeAreaView>
    );
  }

  const title = { create: 'Create account', signin: 'Sign in', storage: 'Where to keep ideas?', forgot: 'Reset password', reset: 'Enter reset code' }[mode];
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: color.paper }}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={{ padding: space[4], gap: space[4] }} keyboardShouldPersistTaps="handled">
          <Text accessibilityRole="header" style={[type.titleLg, { color: color.violet }]}>{title}</Text>
          {msg ? <Text accessibilityLiveRegion="polite" style={[type.body, { color: color.success }]}>{msg}</Text> : null}
          {err.form ? <Text accessibilityRole="alert" style={[type.body, { color: color.danger }]}>{err.form}</Text> : null}

          {mode === 'storage' ? (
            <>
              <StorageOptions value={storage} onChange={setStorage} />
              {busy ? <ActivityIndicator color={color.violet} /> : <Button label="Create my account" onPress={() => run(() => register(name.trim(), email.trim(), pw, storage))} />}
              <Button label="Back" tone="ghost" onPress={() => go('create')} />
            </>
          ) : (
            <>
              {mode === 'create' && <Field label="Name" value={name} onChangeText={setName} error={err.name} autoComplete="name" />}
              <Field label="Email" value={email} onChangeText={setEmail} error={err.email} autoCapitalize="none" keyboardType="email-address" autoComplete="email" />
              {mode === 'reset' && <Field label="Reset code" value={code} onChangeText={setCode} error={err.code} autoCapitalize="characters" autoCorrect={false} />}
              {mode !== 'forgot' && (
                <Field label={mode === 'reset' ? 'New password' : 'Password'} value={pw} onChangeText={setPw} error={err.pw} secureTextEntry
                  autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
                  hint={mode !== 'signin' ? ['Use 8+ characters with a number', 'Weak', 'Fair', 'Good', 'Strong'][pwStrength(pw)] : undefined} />
              )}
              {(mode === 'create' || mode === 'reset') && <Field label="Verify password" value={pw2} onChangeText={setPw2} error={err.pw2} secureTextEntry />}
              {busy ? <ActivityIndicator color={color.violet} /> : (
                <Button label={{ create: 'Continue', signin: 'Sign in', forgot: 'Send reset code', reset: 'Change password' }[mode as 'create']} onPress={submit} />
              )}
              {mode === 'signin' && <Pressable accessibilityRole="button" onPress={() => go('forgot')} style={{ minHeight: 44, justifyContent: 'center' }}><Text style={[type.body, { color: color.violetDeep, textAlign: 'center' }]}>Forgot password?</Text></Pressable>}
              {mode === 'forgot' && <Pressable accessibilityRole="button" onPress={() => go('reset')} style={{ minHeight: 44, justifyContent: 'center' }}><Text style={[type.body, { color: color.violetDeep, textAlign: 'center' }]}>I already have a code</Text></Pressable>}
              <Button label="Back" tone="ghost" onPress={() => go(mode === 'reset' ? 'forgot' : 'welcome')} />
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
