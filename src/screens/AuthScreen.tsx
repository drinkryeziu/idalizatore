import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button, Field } from '../components/ui';
import { color, space, type } from '../theme';
import { StorageChoice, useApp } from '../store';
import { StorageOptions } from './Settings';

type Mode = 'welcome' | 'create' | 'signin' | 'storage';
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export function pwStrength(v: string) {
  let n = 0;
  if (v.length >= 8) n++; if (/[a-z]/.test(v) && /[A-Z]/.test(v)) n++; if (/\d/.test(v)) n++; if (/[^A-Za-z0-9]/.test(v) || v.length >= 12) n++;
  return v ? Math.max(1, n) : 0;
}

export function AuthScreen() {
  const signIn = useApp((s) => s.signIn);
  const [mode, setMode] = useState<Mode>('welcome');
  const [name, setName] = useState(''), [email, setEmail] = useState(''), [pw, setPw] = useState(''), [pw2, setPw2] = useState('');
  const [storage, setStorage] = useState<StorageChoice>('both');
  const [err, setErr] = useState<Record<string, string>>({});

  function submit() {
    const e: Record<string, string> = {};
    if (mode === 'create' && !name.trim()) e.name = 'Enter your name.';
    if (!EMAIL.test(email)) e.email = 'Enter a valid email address.';
    if (mode === 'create' && pwStrength(pw) < 2) e.pw = 'Use at least 8 characters with a number.';
    if (mode === 'signin' && !pw) e.pw = 'Enter your password.';
    if (mode === 'create' && pw !== pw2) e.pw2 = 'Passwords do not match.';
    setErr(e);
    if (Object.keys(e).length) return;
    if (mode === 'create') setMode('storage');
    else signIn(name.trim() || email.split('@')[0], email.trim(), 'both');
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
          <Button label="Create account" tone="light" onPress={() => setMode('create')} />
          <Button label="Sign in" tone="ghost" onPress={() => setMode('signin')} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: color.paper }}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={{ padding: space[4], gap: space[4] }} keyboardShouldPersistTaps="handled">
          <Text accessibilityRole="header" style={[type.titleLg, { color: color.violet }]}>
            {mode === 'create' ? 'Create account' : mode === 'signin' ? 'Sign in' : 'Where to keep ideas?'}
          </Text>
          {mode === 'storage' ? (
            <>
              <StorageOptions value={storage} onChange={setStorage} />
              <Button label="Finish" onPress={() => signIn(name.trim(), email.trim(), storage)} />
            </>
          ) : (
            <>
              {mode === 'create' && <Field label="Name" value={name} onChangeText={setName} error={err.name} autoComplete="name" />}
              <Field label="Email" value={email} onChangeText={setEmail} error={err.email} autoCapitalize="none" keyboardType="email-address" autoComplete="email" />
              <Field label="Password" value={pw} onChangeText={setPw} error={err.pw} secureTextEntry autoComplete={mode === 'create' ? 'new-password' : 'current-password'}
                hint={mode === 'create' ? ['', 'Weak', 'Fair', 'Good', 'Strong'][pwStrength(pw)] : undefined} />
              {mode === 'create' && <Field label="Verify password" value={pw2} onChangeText={setPw2} error={err.pw2} secureTextEntry />}
              <Button label={mode === 'create' ? 'Continue' : 'Sign in'} onPress={submit} />
              <Button label="Back" tone="ghost" onPress={() => { setErr({}); setMode('welcome'); }} />
              <Text style={[type.meta, { color: color.inkSoft, textAlign: 'center' }]}>
                Account sign-in is a local placeholder until the backend exists (see docs/Idealizator-handoff.md section 8).
              </Text>
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
