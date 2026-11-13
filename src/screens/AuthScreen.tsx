import { ReactNode, useEffect, useState } from 'react';
import { ActivityIndicator, Animated, KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Em, Hero, Screen } from '../components/chrome';
import { Icon, IconName } from '../components/Icon';
import { Checkbox, Field, IconBtn, Meter, OptionCard, ResAct, pwStrength } from '../components/ui';
import { color, font, radius, space, typo } from '../theme';
import { StorageChoice, useApp } from '../store';
import { forgotPassword, login, register, setNewPassword } from '../api';
import { STORAGE_OPTS } from './Settings';
import { Legal } from './Legal';
import { LegalDoc, PRIVACY, TERMS } from '../legal';

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
type Mode = 'create' | 'signin' | 'reset';

/** Violet top with a headline, and a white sheet that rises over it (the prototype's auth layout). */
function Shell({ title, sub, onBack, children }: { title: ReactNode; sub: string; onBack?: () => void; children: ReactNode }) {
  const insets = useSafeAreaInsets();
  const [a] = useState(() => new Animated.Value(0));
  useEffect(() => { Animated.timing(a, { toValue: 1, duration: 380, useNativeDriver: true }).start(); }, [a]);
  return (
    <Screen tone="violet" flush>
      <View style={{ paddingTop: space[6], paddingBottom: space[5] }}>
        {onBack ? <View style={{ marginLeft: -space[2], alignSelf: 'flex-start' }}><IconBtn name="arrow-left" label="Back" onPress={onBack} tint={color.paper} /></View> : null}
        <Hero markSize={44} padLeft={0} fontSize={32}>{title}</Hero>
        <Text style={[typo.body15, { marginTop: space[3], maxWidth: 340, color: color.paper, opacity: 0.92 }]}>{sub}</Text>
      </View>
      <Animated.View style={{ flex: 1, minHeight: 0, marginHorizontal: -space[4], borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl, backgroundColor: color.paper, opacity: a, transform: [{ translateY: a.interpolate({ inputRange: [0, 1], outputRange: [24, 0] }) }] }}>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: space[4], paddingTop: space[6], paddingBottom: space[6] + insets.bottom, gap: space[3] }}>{children}</ScrollView>
        </KeyboardAvoidingView>
      </Animated.View>
    </Screen>
  );
}

const TermsLink = ({ label, onPress, light }: { label: string; onPress: () => void; light?: boolean }) => (
  <Text accessibilityRole="link" onPress={onPress} style={{ textDecorationLine: 'underline', color: light ? color.paper : color.violetDeep }}>{label}</Text>
);

function Welcome({ go, onLegal }: { go: (m: Mode) => void; onLegal: (d: LegalDoc) => void }) {
  const feats: [IconName, string, string][] = [['mic', 'Speak your idea', 'Hold the mic and talk. The AI tidies your words.'], ['chart', 'Get a score', 'See its market potential as a forecast percentage.'], ['layers', 'Receive your plans', 'A business plan and a marketing plan for every idea.']];
  const btn = { height: 52, borderRadius: radius.full, borderWidth: 2, alignItems: 'center', justifyContent: 'center', borderColor: color.paper } as const;
  return (
    <Screen tone="violet">
      <ScrollView contentContainerStyle={{ flexGrow: 1 }} showsVerticalScrollIndicator={false}>
        <View style={{ paddingTop: space[8], paddingBottom: space[5] }}>
          <Hero markSize={48} padLeft={0}>Turn your <Em>ideas</Em>{'\n'}into <Em>plans</Em></Hero>
          <Text style={[typo.body15, { marginTop: space[3], maxWidth: 340, color: color.paper, opacity: 0.92 }]}>Record an idea by voice. The AI checks it, scores its market potential and writes your business and marketing plans.</Text>
        </View>
        <View style={{ marginTop: space[2], gap: space[3] }}>
          {feats.map(([icon, t, d]) => (
            <View key={t} style={{ flexDirection: 'row', alignItems: 'center', gap: space[3] }}>
              <View style={{ width: 44, height: 44, borderRadius: radius.full, borderWidth: 1.5, borderColor: color.paper, alignItems: 'center', justifyContent: 'center' }}><Icon name={icon} size={22} color={color.paper} /></View>
              <View style={{ flex: 1 }}>
                <Text style={[typo.button17m, { color: color.paper }]}>{t}</Text>
                <Text style={[typo.body14, { color: color.paper, opacity: 0.92 }]}>{d}</Text>
              </View>
            </View>
          ))}
        </View>
        <View style={{ flex: 1 }} />
        <View style={{ gap: space[3], paddingTop: space[6] }}>
          <Pressable accessibilityRole="button" onPress={() => go('create')} style={[btn, { backgroundColor: color.paper }]}><Text style={[typo.button17m, { color: color.violetDeep }]}>Create account</Text></Pressable>
          <Pressable accessibilityRole="button" onPress={() => go('signin')} style={[btn, { backgroundColor: 'transparent' }]}><Text style={[typo.button17m, { color: color.paper }]}>Sign in</Text></Pressable>
          <Text style={[typo.small12, { textAlign: 'center', color: color.paper, opacity: 0.9, marginTop: space[1] }]}>By continuing you agree to the <TermsLink light label="Terms of Use" onPress={() => onLegal(TERMS)} />.</Text>
        </View>
      </ScrollView>
    </Screen>
  );
}

const Switch = ({ lead, action, onPress }: { lead: string; action: string; onPress: () => void }) => (
  <Text style={[typo.body14, { textAlign: 'center', lineHeight: 22, color: color.inkSoft, marginTop: space[2] }]}>{lead}<Text accessibilityRole="link" onPress={onPress} style={{ fontFamily: font.medium, color: color.violetDeep, textDecorationLine: 'underline' }}>{action}</Text></Text>
);

export function AuthScreen() {
  const say = useApp((s) => s.say);
  const [view, setView] = useState<'welcome' | Mode>('welcome');
  const [step, setStep] = useState<1 | 2>(1);
  const [f, setF] = useState({ name: '', email: '', pw: '', pw2: '' });
  const [show, setShow] = useState(false), [agree, setAgree] = useState(false), [tried, setTried] = useState(false), [busy, setBusy] = useState(false);
  const [storage, setStorage] = useState<StorageChoice>('both');
  const [sent, setSent] = useState<string | null>(null);
  const [formErr, setFormErr] = useState('');
  const [legal, setLegal] = useState<LegalDoc | null>(null);

  const mode: Mode = view === 'welcome' ? 'signin' : view;
  const emailOk = EMAIL.test(f.email.trim()), st = pwStrength(f.pw);
  const errs = {
    name: !f.name.trim() ? 'Enter your name.' : '',
    email: !emailOk ? 'Enter a valid email address.' : '',
    pw: mode === 'signin' ? (!f.pw ? 'Enter your password.' : '') : f.pw.length < 8 ? 'Use at least 8 characters.' : !/\d/.test(f.pw) ? 'Include at least one number.' : '',
    pw2: mode === 'create' ? (!f.pw2 ? 'Repeat your password.' : f.pw2 !== f.pw ? 'The passwords don’t match.' : '') : '',
    agree: !agree ? 'Please accept the terms to continue.' : '',
  };
  const open = (m: Mode, keepEmail = true) => { setView(m); setStep(1); setTried(false); setSent(null); setFormErr(''); setF({ name: '', email: keepEmail ? f.email : '', pw: '', pw2: '' }); };
  const set = (k: keyof typeof f) => (v: string) => setF({ ...f, [k]: v });

  async function run(fn: () => Promise<void>) { setBusy(true); setFormErr(''); try { await fn(); } catch (e: any) { setFormErr(e.message || 'Something went wrong. Try again.'); } finally { setBusy(false); } }
  function submit() {
    if (busy) return;
    if (mode === 'reset') { if (errs.email) return setTried(true); return void run(async () => { await forgotPassword(f.email.trim()); setSent(`If an account exists for ${f.email.trim()}, a reset link is on its way. Open it on this device.`); }); }
    const bad = mode === 'create' ? errs.name || errs.email || errs.pw || errs.pw2 || errs.agree : errs.email || errs.pw;
    if (bad) return setTried(true);
    if (mode === 'create') return setStep(2);
    run(async () => { await login(f.email.trim(), f.pw); say('Welcome back.'); });
  }
  function finish() {
    run(async () => {
      const r = await register(f.name.trim(), f.email.trim(), f.pw, storage);
      if (r === 'confirm') setSent(`We sent a link to ${f.email.trim()}. Open it on this device to confirm your email, then sign in.`);
      else say(`Welcome, ${f.name.trim().split(' ')[0] || 'there'}! Hold the mic to record your first idea.`);
    });
  }

  if (legal) return <Legal doc={legal} onBack={() => setLegal(null)} signedOut />;
  if (view === 'welcome') return <Welcome go={(m) => open(m)} onLegal={setLegal} />;

  const title = mode === 'create' ? <>Create your <Em>account</Em></> : mode === 'signin' ? <>Welcome <Em>back</Em></> : <>Reset your <Em>password</Em></>;
  const sub = step === 2 ? 'One last thing' : mode === 'create' ? 'Keep every idea safe and get a score, a business plan and a marketing plan for each.' : mode === 'signin' ? 'Sign in to open your ideas and reports.' : 'Enter your email and we’ll send you a link to choose a new one.';
  const err = (k: keyof typeof errs) => (tried ? errs[k] : '');
  const Err = formErr ? <Text accessibilityRole="alert" style={[typo.meta13, { color: color.danger }]}>{formErr}</Text> : null;

  let body: ReactNode;
  if (sent) {
    body = (
      <View style={{ alignItems: 'center', paddingTop: space[4], gap: space[3] }}>
        <View style={{ width: 72, height: 72, borderRadius: radius.full, backgroundColor: color.violet, alignItems: 'center', justifyContent: 'center' }}><Icon name="check" size={36} color={color.paper} /></View>
        <Text accessibilityRole="header" style={[typo.titleMd, { fontFamily: font.semi, color: color.violetDeep }]}>Check your email</Text>
        <Text style={[typo.body14, { color: color.inkSoft, textAlign: 'center', maxWidth: 300 }]}>{sent}</Text>
        <ResAct primary label="Back to sign in" onPress={() => open('signin')} style={{ alignSelf: 'stretch', marginTop: space[2] }} />
      </View>
    );
  } else if (step === 2) {
    body = (
      <>
        <Text style={[typo.small12, { fontFamily: font.medium, letterSpacing: 0.5, textTransform: 'uppercase', color: color.violetDeep }]}>Step 2 of 2</Text>
        <Text accessibilityRole="header" style={[typo.titleMd, { fontFamily: font.semi, color: color.violetDeep }]}>Where should we keep your ideas?</Text>
        <Text style={[typo.body14, { color: color.inkSoft }]}>You can change this later in Settings.</Text>
        <View style={{ gap: space[2] }}>{STORAGE_OPTS.map((o) => <OptionCard key={o.id} selected={storage === o.id} onPress={() => setStorage(o.id)} icon={o.icon} title={o.title} tag={o.tag} text={o.text} />)}</View>
        {Err}
        {busy ? <ActivityIndicator color={color.violet} /> : <ResAct primary label="Start recording" onPress={finish} style={{ marginTop: space[2] }} />}
      </>
    );
  } else {
    body = (
      <>
        {mode === 'create' ? <Text style={[typo.small12, { fontFamily: font.medium, letterSpacing: 0.5, textTransform: 'uppercase', color: color.violetDeep }]}>Step 1 of 2</Text> : null}
        {mode === 'create' ? <Field label="Full name" value={f.name} onChangeText={set('name')} error={err('name')} autoComplete="name" placeholder="Alex Morgan" /> : null}
        <Field label="Email" value={f.email} onChangeText={set('email')} error={err('email')} autoCapitalize="none" keyboardType="email-address" autoComplete="email" placeholder="you@example.com" />
        {mode !== 'reset' ? <Field label={mode === 'create' ? 'Create a password' : 'Password'} value={f.pw} onChangeText={set('pw')} error={err('pw')} password show={show} onToggleShow={() => setShow(!show)} autoComplete={mode === 'create' ? 'new-password' : 'current-password'} /> : null}
        {mode === 'create' ? <Meter value={st} /> : null}
        {mode === 'create' ? <Field label="Verify password" value={f.pw2} onChangeText={set('pw2')} error={err('pw2')} password show={show} onToggleShow={() => setShow(!show)} autoComplete="new-password" /> : null}
        {mode === 'create' && f.pw2 && f.pw2 === f.pw && f.pw.length >= 8 ? <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}><Icon name="check" size={16} color={color.success} /><Text style={[typo.meta13, { color: color.success }]}>Passwords match.</Text></View> : null}
        {mode === 'signin' ? <Text accessibilityRole="link" onPress={() => open('reset')} style={[typo.body14m, { alignSelf: 'flex-end', marginTop: -6, paddingVertical: 4, paddingHorizontal: 8, color: color.violetDeep, textDecorationLine: 'underline' }]}>Forgot password?</Text> : null}
        {mode === 'create' ? (
          <Checkbox checked={agree} onChange={setAgree} error={tried && !!errs.agree}>
            <Text style={[typo.meta13, { color: color.inkSoft }]}>I agree to the <TermsLink label="Terms of Use" onPress={() => setLegal(TERMS)} /> and the <TermsLink label="Privacy Policy" onPress={() => setLegal(PRIVACY)} />.</Text>
          </Checkbox>
        ) : null}
        {mode === 'create' && tried && errs.agree ? <Text accessibilityRole="alert" style={[typo.meta13, { color: color.danger }]}>{errs.agree}</Text> : null}
        {Err}
        <ResAct primary disabled={busy} onPress={submit} style={{ marginTop: space[2] }} label={busy ? (mode === 'create' ? 'Creating account…' : 'Signing in…') : mode === 'create' ? 'Create account' : mode === 'signin' ? 'Sign in' : 'Send reset link'} />
        {mode !== 'reset' ? (
          <>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: space[3] }}><View style={{ flex: 1, height: 1, backgroundColor: color.violetLine }} /><Text style={[typo.small12, { color: color.inkSoft }]}>or</Text><View style={{ flex: 1, height: 1, backgroundColor: color.violetLine }} /></View>
            <View style={{ gap: space[2] }}>
              {['Apple', 'Google'].map((n) => <ResAct key={n} label={`Continue with ${n}`} onPress={() => say(`${n} sign-in isn’t connected yet.`)} />)}
            </View>
          </>
        ) : null}
        {mode === 'create' ? <Switch lead="Forgot your password? " action="Reset it" onPress={() => open('reset')} /> : null}
        <Switch lead={mode === 'create' ? 'Already have an account? ' : mode === 'signin' ? 'New to Idealizator? ' : 'Remembered it? '} action={mode === 'create' ? 'Sign in' : mode === 'signin' ? 'Create an account' : 'Sign in'} onPress={() => open(mode === 'create' ? 'signin' : mode === 'signin' ? 'create' : 'signin')} />
      </>
    );
  }
  return <Shell title={title} sub={sub} onBack={() => (step === 2 ? setStep(1) : sent ? open('signin') : setView('welcome'))}>{body}</Shell>;
}

/** After the reset link in the email is opened: choose a new password and continue signed in. */
export function NewPasswordScreen() {
  const [pw, setPw] = useState(''), [pw2, setPw2] = useState(''), [show, setShow] = useState(false), [err, setErr] = useState(''), [busy, setBusy] = useState(false), [tried, setTried] = useState(false);
  const problem = pw.length < 8 ? 'Use at least 8 characters.' : !/\d/.test(pw) ? 'Include at least one number.' : '';
  async function save() {
    setTried(true);
    if (problem || pw !== pw2) return;
    setBusy(true); setErr('');
    try { await setNewPassword(pw); useApp.getState().say('Password updated.'); } catch (e: any) { setErr(e.message); } finally { setBusy(false); }
  }
  return (
    <Shell title={<>Choose a new <Em>password</Em></>} sub="Pick a password you have not used here before.">
      <Field label="New password" value={pw} onChangeText={setPw} error={tried ? problem : ''} password show={show} onToggleShow={() => setShow(!show)} autoComplete="new-password" />
      <Meter value={pwStrength(pw)} />
      <Field label="Verify password" value={pw2} onChangeText={setPw2} error={tried && !problem && pw !== pw2 ? 'The passwords don’t match.' : ''} password show={show} onToggleShow={() => setShow(!show)} autoComplete="new-password" />
      {err ? <Text accessibilityRole="alert" style={[typo.meta13, { color: color.danger }]}>{err}</Text> : null}
      {busy ? <ActivityIndicator color={color.violet} /> : <ResAct primary label="Save password" onPress={save} style={{ marginTop: space[2] }} />}
    </Shell>
  );
}
