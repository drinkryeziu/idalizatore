import { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, TextInput, TextInputProps, View, ViewStyle } from 'react-native';
import { color, radius, size, space, type } from '../theme';
import { Icon, IconName } from './Icon';

export function Button({ label, onPress, disabled, tone = 'solid', style }: { label: string; onPress: () => void; disabled?: boolean; tone?: 'solid' | 'ghost' | 'light'; style?: ViewStyle }) {
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={label} disabled={disabled} onPress={onPress}
      style={({ pressed }) => [s.btn, tone === 'ghost' && s.btnGhost, tone === 'light' && s.btnLight, pressed && { opacity: 0.8 }, disabled && { opacity: 0.4 }, style]}>
      <Text style={[type.bodyStrong, { color: tone === 'ghost' ? color.violetDeep : tone === 'light' ? color.violet : color.paper }]}>{label}</Text>
    </Pressable>
  );
}

export function IconButton({ name, label, onPress, tint = color.violet }: { name: IconName; label: string; onPress: () => void; tint?: string }) {
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={onPress} hitSlop={4} style={s.iconBtn}>
      <Icon name={name} color={tint} />
    </Pressable>
  );
}

export function Field({ label, error, hint, ...p }: TextInputProps & { label: string; error?: string; hint?: string }) {
  return (
    <View style={{ gap: 4 }}>
      <Text style={[type.meta, { color: color.inkSoft, fontFamily: 'FiraSans_500Medium' }]}>{label}</Text>
      <TextInput accessibilityLabel={label} placeholderTextColor={color.inkSoft} {...p} style={[s.input, error ? { borderColor: color.danger } : null]} />
      {error ? <Text style={[type.meta, { color: color.danger }]}>{error}</Text> : hint ? <Text style={[type.meta, { color: color.inkSoft }]}>{hint}</Text> : null}
    </View>
  );
}

export function PageTitle({ children, tone = 'paper' }: { children: ReactNode; tone?: 'paper' | 'violet' }) {
  return <Text accessibilityRole="header" style={[type.titleLg, { color: tone === 'violet' ? color.paper : color.violet, marginTop: space[4] }]}>{children}</Text>;
}

export function ScoreChip({ score, stale }: { score: number; stale?: boolean }) {
  const c = score < 40 ? color.danger : score < 70 ? color.warning : color.success;
  return (
    <View style={[s.chip, { borderColor: c, borderStyle: stale ? 'dashed' : 'solid' }]}>
      <Text style={{ color: c, fontSize: 11, lineHeight: 16, fontFamily: 'FiraSans_600SemiBold' }}>{score}%{score > 80 ? ' ★' : ''}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  btn: { height: size.touch, paddingHorizontal: space[6], borderRadius: radius.full, backgroundColor: color.violet, alignItems: 'center', justifyContent: 'center' },
  btnGhost: { backgroundColor: color.violetTint, borderWidth: 1, borderColor: color.violetLine },
  btnLight: { backgroundColor: color.paper },
  iconBtn: { minWidth: size.touch, height: size.touch, alignItems: 'center', justifyContent: 'center' },
  input: { height: 48, paddingHorizontal: space[3], borderWidth: 1, borderColor: color.violetLine, borderRadius: radius.md, backgroundColor: color.paper, color: color.ink, fontFamily: 'FiraSans_400Regular', fontSize: 16 },
  chip: { paddingHorizontal: 7, borderWidth: 1, borderRadius: radius.full },
});
