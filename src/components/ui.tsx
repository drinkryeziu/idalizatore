import { ReactNode, useEffect, useState } from 'react';
import { Animated, Platform, Pressable, StyleProp, Text, TextInput, TextInputProps, View, ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { bandColor, color, font, radius, scoreBand, space, typo } from '../theme';
import { Icon, IconName } from './Icon';

const web = (o: object) => (Platform.OS === 'web' ? (o as any) : null);

export function IconBtn({ name, label, onPress, tint = color.violet, size = 24 }: { name: IconName; label: string; onPress: () => void; tint?: string; size?: number }) {
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={onPress} hitSlop={4}
      style={({ pressed }) => ({ minWidth: 44, height: 44, alignItems: 'center', justifyContent: 'center', borderRadius: radius.sm, opacity: pressed ? 0.6 : 1 })}>
      <Icon name={name} size={size} color={tint} />
    </Pressable>
  );
}

export function PageTitle({ children, tone = 'paper' }: { children: ReactNode; tone?: 'paper' | 'violet' }) {
  return <Text accessibilityRole="header" style={[typo.pageTitle, { color: tone === 'violet' ? color.paper : color.violet, marginTop: space[4] }]}>{children}</Text>;
}

/** A white card with a violet hairline (the prototype's .res-panel). */
export function Panel({ children, style, tint }: { children: ReactNode; style?: StyleProp<ViewStyle>; tint?: boolean }) {
  return <View style={[{ marginTop: space[3], padding: space[4], borderWidth: 1, borderColor: color.violetLine, borderRadius: radius.lg, backgroundColor: tint ? color.violetTint : color.paper }, style]}>{children}</View>;
}
export const H3 = ({ children }: { children: ReactNode }) => <Text accessibilityRole="header" style={[typo.h3, { color: color.violetDeep, marginBottom: space[3] }]}>{children}</Text>;
export const Lead = ({ children, style }: { children: ReactNode; style?: any }) => <Text style={[typo.body14, { color: color.inkSoft, marginBottom: space[3] }, style]}>{children}</Text>;
export const FootNote = ({ children }: { children: ReactNode }) => <Text style={[{ fontFamily: font.regular, fontSize: 12, lineHeight: 17, color: color.inkSoft, marginTop: space[2] }]}>{children}</Text>;

/** The prototype's pill action (.res-act): tinted by default, solid violet when primary, red outline when danger. */
export function ResAct({ label, onPress, primary, danger, disabled, icon, height = 48, style }: { label: string; onPress: () => void; primary?: boolean; danger?: boolean; disabled?: boolean; icon?: IconName; height?: number; style?: StyleProp<ViewStyle> }) {
  const fg = primary ? color.paper : danger ? color.danger : color.violetDeep;
  const border = primary ? color.violet : danger ? color.danger : color.violetLine;
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={label} accessibilityState={{ disabled: !!disabled }} disabled={disabled} onPress={onPress}
      style={({ pressed }) => [{ height, paddingHorizontal: space[4], borderRadius: radius.full, borderWidth: 1, borderColor: border, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: space[2], opacity: disabled ? 0.4 : 1,
        backgroundColor: primary ? (pressed ? color.violetDeep : color.violet) : danger ? (pressed ? '#fdeceb' : color.paper) : color.violetTint }, style]}>
      {icon ? <Icon name={icon} size={20} color={fg} /> : null}
      <Text style={[typo.label16m, { color: fg }]}>{label}</Text>
    </Pressable>
  );
}

export function Field({ label, error, hint, password, show, onToggleShow, ...rest }: TextInputProps & { label: string; error?: string; hint?: string; password?: boolean; show?: boolean; onToggleShow?: () => void }) {
  const [focus, setFocus] = useState(false);
  return (
    <View style={{ gap: 4 }}>
      <Text style={[typo.label13m, { color: color.inkSoft }]}>{label}</Text>
      <View>
        <TextInput accessibilityLabel={label} placeholderTextColor={color.inkSoft} {...rest} secureTextEntry={password && !show}
          onFocus={() => setFocus(true)} onBlur={() => setFocus(false)}
          style={[{ height: 48, paddingHorizontal: space[3], paddingRight: password ? 64 : space[3], borderWidth: 1, borderRadius: radius.md, backgroundColor: color.paper, color: color.ink, fontFamily: font.regular, fontSize: 16, borderColor: error ? color.danger : focus ? color.violet : color.violetLine },
            web({ outlineStyle: 'none', boxShadow: focus ? '0 0 0 3px rgba(177, 0, 217, 0.15)' : 'none' })]} />
        {password ? (
          <Pressable accessibilityRole="button" onPress={onToggleShow} style={{ position: 'absolute', top: 6, right: 6, height: 36, paddingHorizontal: 12, justifyContent: 'center' }}>
            <Text style={[typo.body14m, { color: color.violetDeep }]}>{show ? 'Hide' : 'Show'}</Text>
          </Pressable>
        ) : null}
      </View>
      {error ? <Text accessibilityRole="alert" style={[typo.meta13, { color: color.danger }]}>{error}</Text> : hint ? <Text style={[typo.meta13, { color: color.inkSoft }]}>{hint}</Text> : null}
    </View>
  );
}

export function pwStrength(v: string) {
  let n = 0;
  if (v.length >= 8) n++; if (/[a-z]/.test(v) && /[A-Z]/.test(v)) n++; if (/\d/.test(v)) n++; if (/[^A-Za-z0-9]/.test(v) || v.length >= 12) n++;
  return v ? Math.max(1, n) : 0;
}
export function Meter({ value }: { value: number }) {
  const fill = value <= 1 ? color.dangerFill : value === 2 ? color.amber : color.successFill;
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: -4 }} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      {[1, 2, 3, 4].map((n) => <View key={n} style={{ flex: 1, height: 4, borderRadius: radius.full, backgroundColor: n <= value ? fill : color.field }} />)}
      <Text style={{ minWidth: 96, marginLeft: space[2], textAlign: 'right', fontFamily: font.regular, fontSize: 12, lineHeight: 16, color: color.inkSoft }}>
        {value === 0 ? 'At least 8 characters' : value <= 1 ? 'Weak' : value === 2 ? 'Fair' : value === 3 ? 'Good' : 'Strong'}
      </Text>
    </View>
  );
}

export const Star = () => <Text accessibilityLabel="Top idea" style={{ marginLeft: 6, fontSize: 17, lineHeight: 17, color: color.amber, textShadowColor: 'rgba(255, 183, 0, 0.9)', textShadowRadius: 8, textShadowOffset: { width: 0, height: 0 } }}>★</Text>;

/** The score chip: percentage in its band colour, dashed when the idea changed since the report. */
export function Chip({ score, stale }: { score: number; stale?: boolean }) {
  const c = bandColor[scoreBand(score)];
  return (
    <View accessibilityLabel={`Forecasted success rate: ${scoreBand(score) === 'good' ? 'good' : scoreBand(score) === 'medium' ? 'medium' : 'low'}`}
      style={{ alignSelf: 'flex-start', marginLeft: space[2], paddingHorizontal: 7, borderWidth: 1, borderColor: c, borderStyle: stale ? 'dashed' : 'solid', borderRadius: radius.full }}>
      <Text style={[typo.chip11, { color: c, fontVariant: ['tabular-nums'] }]}>{score}%</Text>
    </View>
  );
}
export function Tag({ children, soft }: { children: ReactNode; soft?: boolean }) {
  return (
    <View style={{ paddingHorizontal: 8, borderRadius: radius.full, backgroundColor: soft ? color.paper : color.violet, borderWidth: soft ? 1 : 0, borderColor: color.violetLine }}>
      <Text style={[typo.tag11, { color: soft ? color.inkSoft : color.paper }]}>{children}</Text>
    </View>
  );
}

export function Avatar({ name, size = 44 }: { name: string; size?: number }) {
  return (
    <View style={{ width: size, height: size, borderRadius: radius.full, backgroundColor: color.violet, alignItems: 'center', justifyContent: 'center' }}>
      <Text style={{ fontFamily: font.semi, fontSize: size > 50 ? 24 : 20, color: color.paper }}>{(name || '?').trim().charAt(0).toUpperCase()}</Text>
    </View>
  );
}

/** A selectable card (storage choice, plan, reason). */
export function OptionCard({ selected, onPress, icon, title, tag, text, children, center }: { selected: boolean; onPress: () => void; icon?: IconName; title: string; tag?: string; text?: string; children?: ReactNode; center?: boolean }) {
  return (
    <Pressable accessibilityRole="radio" accessibilityState={{ selected }} onPress={onPress}
      style={{ flexDirection: 'row', alignItems: center ? 'center' : 'flex-start', gap: space[3], padding: space[3], borderWidth: 1, borderRadius: 14, borderColor: selected ? color.violet : color.violetLine, backgroundColor: selected ? color.violetTint : color.paper }}>
      {icon ? (
        <View style={{ width: 40, height: 40, borderRadius: radius.full, alignItems: 'center', justifyContent: 'center', backgroundColor: selected ? color.violet : color.violetTint }}>
          <Icon name={icon} size={22} color={selected ? color.paper : color.violetDeep} />
        </View>
      ) : null}
      <View style={{ flex: 1, gap: 2 }}>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: space[2] }}>
          <Text style={[typo.body16m, { lineHeight: 22, color: color.ink }]}>{title}</Text>
          {tag ? <Tag>{tag}</Tag> : null}
        </View>
        {text ? <Text style={[typo.meta13, { color: color.inkSoft }]}>{text}</Text> : null}
        {children}
      </View>
      <View style={{ width: 22, height: 22, marginTop: center ? 0 : 2, borderRadius: radius.full, borderWidth: 2, borderColor: selected ? color.violet : color.violetLine, backgroundColor: selected ? color.violet : 'transparent', alignItems: 'center', justifyContent: 'center' }}>
        {selected ? <Icon name="check" size={14} color={color.paper} strokeWidth={3} /> : null}
      </View>
    </Pressable>
  );
}

/** A full-width tinted row that opens something (Edit account details, Terms of Use, Sign out). */
export function SetRow({ label, onPress, icon, out }: { label: string; onPress: () => void; icon?: IconName; out?: boolean }) {
  return (
    <Pressable accessibilityRole="button" onPress={onPress}
      style={{ minHeight: 48, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: space[3], paddingHorizontal: space[3], marginTop: space[2], borderWidth: 1, borderColor: color.violetLine, borderRadius: radius.md, backgroundColor: out ? color.paper : color.violetTint }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: space[3], flex: 1 }}>
        {icon ? <Icon name={icon} size={20} color={out ? color.danger : color.violetDeep} /> : null}
        <Text style={[typo.body15m, { color: out ? color.danger : color.violetDeep }]}>{label}</Text>
      </View>
      <Icon name="right" size={20} color={out ? color.danger : color.violetDeep} />
    </Pressable>
  );
}

export function Checkbox({ checked, onChange, children, error }: { checked: boolean; onChange: (v: boolean) => void; children: ReactNode; error?: boolean }) {
  return (
    <Pressable accessibilityRole="checkbox" accessibilityState={{ checked }} onPress={() => onChange(!checked)} style={{ flexDirection: 'row', alignItems: 'flex-start', gap: space[3], minHeight: 44 }}>
      <View style={{ width: 22, height: 22, marginTop: 2, borderRadius: 5, borderWidth: 2, borderColor: error ? color.danger : color.violet, backgroundColor: checked ? color.violet : color.paper, alignItems: 'center', justifyContent: 'center' }}>
        {checked ? <Icon name="check" size={14} color={color.paper} strokeWidth={3} /> : null}
      </View>
      <View style={{ flex: 1 }}>{children}</View>
    </Pressable>
  );
}

/** Bottom-anchored, high contrast: solid violet-deep for news, white with a red ring for warnings. */
export function Toast({ text, warn, onDismiss }: { text: string; warn: boolean; onDismiss: () => void }) {
  const insets = useSafeAreaInsets();
  const [a] = useState(() => new Animated.Value(0));
  useEffect(() => { Animated.timing(a, { toValue: 1, duration: 320, useNativeDriver: true }).start(); }, [a, text]);
  return (
    <Animated.View accessibilityRole={warn ? 'alert' : undefined} accessibilityLiveRegion="polite"
      style={[{ position: 'absolute', zIndex: 12, left: space[4], right: space[4], bottom: space[4] + insets.bottom, maxWidth: 480, alignSelf: 'center', width: '100%', flexDirection: 'row', alignItems: 'center', gap: space[3], paddingVertical: 10, paddingLeft: 12, paddingRight: 8, borderRadius: radius.lg, borderWidth: warn ? 2 : 1,
        borderColor: warn ? color.danger : color.violetDeep, backgroundColor: warn ? color.paper : color.violetDeep, opacity: a, transform: [{ translateY: a.interpolate({ inputRange: [0, 1], outputRange: [20, 0] }) }] },
        web({ boxShadow: '0 12px 32px rgba(37, 37, 37, 0.35), 0 2px 8px rgba(37, 37, 37, 0.2)' })]}>
      <View style={{ width: 24, height: 24, borderRadius: radius.full, backgroundColor: warn ? color.danger : color.paper, alignItems: 'center', justifyContent: 'center' }}>
        <Icon name={warn ? 'alert' : 'check'} size={16} color={warn ? color.paper : color.violetDeep} />
      </View>
      <Text style={[typo.body15m, { lineHeight: 21, flex: 1, color: warn ? color.ink : color.paper }]}>{text}</Text>
      <Pressable accessibilityRole="button" accessibilityLabel="Dismiss" onPress={onDismiss} style={{ width: 32, height: 32, alignItems: 'center', justifyContent: 'center' }}>
        <Icon name="x" size={16} color={warn ? color.ink : color.paper} />
      </Pressable>
    </Animated.View>
  );
}
