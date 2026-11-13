import { useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, Animated, Easing, Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { color, radius, size, space, type } from '../theme';
import { Icon, IconName } from './Icon';
import { IconButton } from './ui';
import { Route, useApp } from '../store';

const ITEMS: { route: Route; label: string; icon: IconName }[] = [
  { route: 'record', label: 'Ready to record', icon: 'mic' },
  { route: 'ideas', label: 'Recorded Ideas', icon: 'list' },
  { route: 'analyzed', label: 'Analyzed Ideas', icon: 'chart' },
  { route: 'settings', label: 'Settings', icon: 'sliders' },
];

/** One white panel: slides in from the right and out with the same 360 ms ease (handoff 3.8). Respects reduced motion. */
export function MenuDrawer() {
  const { menuOpen, setMenu, go, route, ideas, user } = useApp();
  const { width } = useWindowDimensions();
  const x = useRef(new Animated.Value(width)).current;
  const [mounted, setMounted] = useState(false);
  const [reduce, setReduce] = useState(false);
  useEffect(() => { AccessibilityInfo.isReduceMotionEnabled().then(setReduce); }, []);

  useEffect(() => {
    const dur = reduce ? 0 : 360;
    const cfg = { duration: dur, easing: Easing.bezier(0.4, 0, 0.2, 1), useNativeDriver: true };
    if (menuOpen) { setMounted(true); Animated.timing(x, { toValue: 0, ...cfg }).start(); }
    else if (mounted) Animated.timing(x, { toValue: width, ...cfg }).start(() => setMounted(false));
  }, [menuOpen]);

  if (!mounted) return null;
  const analyzed = ideas.filter((i) => i.report).length;
  const count = (r: Route) => (r === 'ideas' ? ideas.length : r === 'analyzed' ? analyzed : null);
  return (
    <Animated.View style={[StyleSheet.absoluteFill, s.panel, { transform: [{ translateX: x }] }]} accessibilityViewIsModal>
      <SafeAreaView style={{ flex: 1 }}>
        <View style={s.head}>
          <Text style={[type.titleMd, { color: color.violetDeep }]}>Idealizator</Text>
          <IconButton name="x" label="Close menu" onPress={() => setMenu(false)} />
        </View>
        <ScrollView contentContainerStyle={{ flexGrow: 1 }}>
          {ITEMS.map((it) => {
            const n = count(it.route), cur = it.route === route;
            return (
              <Pressable key={it.route} accessibilityRole="button" accessibilityState={{ selected: cur }} onPress={() => go(it.route)}
                style={[s.item, cur && s.itemCurrent]}>
                <Icon name={it.icon} color={color.violetDeep} />
                <Text style={[type.bodyStrong, { color: color.violetDeep, flex: 1 }]}>{it.label}</Text>
                {n !== null && <Text style={s.count}>{n}</Text>}
              </Pressable>
            );
          })}
          <View style={{ flex: 1 }} />
          <Pressable accessibilityRole="button" onPress={() => go('settings')} style={s.acct}>
            <View style={s.avatar}><Text style={{ color: color.paper, fontSize: 20, fontFamily: 'FiraSans_600SemiBold' }}>{(user?.name || '?')[0]?.toUpperCase()}</Text></View>
            <View style={{ flex: 1 }}>
              <Text style={[type.bodyStrong, { fontSize: 15 }]} numberOfLines={1}>{user?.name}</Text>
              <Text style={[type.meta, { color: color.inkSoft }]} numberOfLines={1}>{user?.email}</Text>
            </View>
          </Pressable>
        </ScrollView>
      </SafeAreaView>
    </Animated.View>
  );
}

const s = StyleSheet.create({
  panel: { zIndex: 9, backgroundColor: color.paper, paddingHorizontal: space[4] },
  head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: size.touch },
  item: { flexDirection: 'row', alignItems: 'center', gap: space[4], minHeight: 52, paddingHorizontal: space[3], borderRadius: 14, borderWidth: 1, borderColor: 'transparent', marginTop: space[2] },
  itemCurrent: { backgroundColor: color.violetTint, borderColor: color.violet },
  count: { minWidth: 26, paddingHorizontal: 8, borderWidth: 1, borderColor: color.violetLine, borderRadius: radius.full, textAlign: 'center', color: color.violetDeep, fontSize: 13, lineHeight: 22, fontFamily: 'FiraSans_500Medium' },
  acct: { flexDirection: 'row', alignItems: 'center', gap: space[3], padding: space[3], borderWidth: 1, borderColor: color.violetLine, borderRadius: radius.lg, backgroundColor: color.violetTint, marginBottom: space[4] },
  avatar: { width: 44, height: 44, borderRadius: radius.full, backgroundColor: color.violet, alignItems: 'center', justifyContent: 'center' },
});
