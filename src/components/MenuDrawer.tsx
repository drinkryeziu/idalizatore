import { useEffect, useState } from 'react';
import { AccessibilityInfo, Animated, Easing, Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { usePathname } from 'expo-router';
import { color, radius, size, space, typo } from '../theme';
import { Icon, IconName, Logo } from './Icon';
import { Avatar, IconBtn } from './ui';
import { Route, routeFromPath, useApp } from '../store';

const ITEMS: { route: Route; label: string; icon: IconName }[] = [
  { route: 'record', label: 'Ready to record', icon: 'mic' },
  { route: 'ideas', label: 'Recorded Ideas', icon: 'list' },
  { route: 'analyzed', label: 'Analyzed Ideas', icon: 'chart' },
  { route: 'settings', label: 'Settings', icon: 'sliders' },
];

/** One white panel: slides in from the right and out with the same 360 ms ease; links do not animate on their own (handoff 3.8). Respects reduced motion. */
export function MenuDrawer() {
  const { menuOpen, setMenu, go, ideas, user } = useApp();
  const path = usePathname();
  const route = routeFromPath(path) ?? (path.startsWith('/result') ? 'analyzed' : path.startsWith('/billing') ? 'settings' : null);
  const width = Math.min(useWindowDimensions().width, 430); // matches the phone frame on the web
  const [x] = useState(() => new Animated.Value(width));
  const [mounted, setMounted] = useState(false);
  const [reduce, setReduce] = useState(false);
  useEffect(() => { AccessibilityInfo.isReduceMotionEnabled().then(setReduce); }, []);

  /* The panel mounts first, then slides; it unmounts after sliding out. That is a legitimate setState inside the effect. */
  /* eslint-disable react-hooks/set-state-in-effect, react-hooks/exhaustive-deps -- only menuOpen should start an animation */
  useEffect(() => {
    const cfg = { duration: reduce ? 0 : 360, easing: Easing.bezier(0.4, 0, 0.2, 1), useNativeDriver: true };
    if (menuOpen) { setMounted(true); Animated.timing(x, { toValue: 0, ...cfg }).start(); }
    else if (mounted) Animated.timing(x, { toValue: width, ...cfg }).start(() => setMounted(false));
  }, [menuOpen]);
  /* eslint-enable react-hooks/set-state-in-effect, react-hooks/exhaustive-deps */

  if (!mounted || !user) return null;
  const count = (r: Route) => (r === 'ideas' ? ideas.length : r === 'analyzed' ? ideas.filter((i) => i.report).length : null);
  return (
    <Animated.View style={[StyleSheet.absoluteFill, { zIndex: 9, backgroundColor: color.paper, paddingHorizontal: space[4], transform: [{ translateX: x }] }]} accessibilityViewIsModal>
      <SafeAreaView style={{ flex: 1, paddingTop: space[4] }}>{/* same top spacing as the page headers, so the X lines up with the X on Settings */}
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: size.touch, paddingTop: 4 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: space[3] }}>
            <Logo size={36} color={color.violet} />
            <Text style={[typo.titleMd, { fontSize: 20, lineHeight: 26, color: color.violetDeep }]}>Idealizator</Text>
          </View>
          <IconBtn name="x" label="Close menu" onPress={() => setMenu(false)} />
        </View>
        <ScrollView contentContainerStyle={{ flexGrow: 1 }}>
          <View style={{ marginTop: space[5], gap: space[2] }}>
            {ITEMS.map((it) => {
              const n = count(it.route), cur = it.route === route;
              return (
                <Pressable key={it.route} accessibilityRole="button" accessibilityState={{ selected: cur }} onPress={() => go(it.route)}
                  style={{ minHeight: 52, flexDirection: 'row', alignItems: 'center', gap: space[4], paddingHorizontal: space[3], borderWidth: 1, borderRadius: 14, borderColor: cur ? color.violet : 'transparent', backgroundColor: cur ? color.violetTint : 'transparent' }}>
                  <Icon name={it.icon} color={color.violetDeep} />
                  <Text style={[typo.button17m, { flex: 1, color: color.violetDeep }]}>{it.label}</Text>
                  {n !== null ? <View style={{ minWidth: 26, paddingHorizontal: 8, borderWidth: 1, borderRadius: radius.full, borderColor: cur ? color.violet : color.violetLine }}><Text style={[typo.body14m, { fontSize: 13, lineHeight: 22, textAlign: 'center', color: color.violetDeep }]}>{n}</Text></View> : null}
                </Pressable>
              );
            })}
          </View>
          <View style={{ flex: 1 }} />
          <Pressable accessibilityRole="button" onPress={() => go('settings')}
            style={{ flexDirection: 'row', alignItems: 'center', gap: space[3], padding: space[3], marginBottom: space[4], borderWidth: 1, borderColor: color.violetLine, borderRadius: radius.lg, backgroundColor: color.violetTint }}>
            <Avatar name={user.name} />
            <View style={{ flex: 1 }}>
              <Text numberOfLines={1} style={[typo.body15m, { color: color.ink }]}>{user.name}</Text>
              <Text numberOfLines={1} style={[typo.meta13, { color: color.inkSoft }]}>{user.email}</Text>
            </View>
            <Icon name="right" size={20} color={color.violet} />
          </Pressable>
        </ScrollView>
      </SafeAreaView>
    </Animated.View>
  );
}
