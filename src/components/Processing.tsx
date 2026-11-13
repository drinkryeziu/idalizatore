import { useCallback, useEffect, useState } from 'react';
import { AccessibilityInfo, Animated, Easing, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { color, space, type } from '../theme';

const FORMULAS = ['E = mc²', 'a² + b² = c²', '∫√(a² − x²) dx', '∇φ(x, y, z)', 'Δ = b² − 4ac', 'ax² + bx + c = 0', 'c = πr²', 'x̄ = Σxᵢ / n', 'e^(iπ) + 1 = 0', 'P(A|B) = P(B|A)·P(A) / P(B)', 'x = (−b ± √Δ) / 2a', 'sin²θ + cos²θ = 1', 'ROI = (gain − cost) / cost', 'LTV > 3 × CAC', 'margin = (p − c) / p', 'TAM → SAM → SOM', 'y = mx + b', 'F = ma'];
const SNIPPETS = ['const score = analyze(idea);', 'def forecast(market):', 'SELECT * FROM ideas WHERE score > 80;', 'if (idea.isGood()) launch();', 'fn main() { think(); }', 'let plan = await ai.plan(idea);', 'while (!done) refine(plan);', 'return demand * fit / risk', 'ideas.map(i => i.score)'];
const ROWS = [4, 12, 20, 28, 36, 64, 72, 80, 88, 94];
const pick = <T,>(a: T[]) => a[Math.floor(Math.random() * a.length)];

function Item({ row, first, reduce }: { row: number; first: boolean; reduce: boolean }) {
  const { width, height } = useWindowDimensions();
  const mk = useCallback(() => {
    const code = Math.random() < 0.28;
    return { code, text: pick(code ? SNIPPETS : FORMULAS), left: (0.16 + Math.random() * 0.68) * width, top: (ROWS[row] + Math.random() * 3 - 1.5) / 100 * height,
      size: code ? 8 + Math.random() * 2 : 12 + Math.random() * 6, rot: code ? 0 : Math.random() * 8 - 4, dx: (Math.random() < 0.5 ? -1 : 1) * (10 + Math.random() * 60), ms: 2300 + Math.random() * 1600 };
  }, [width, height, row]);
  const [it, setIt] = useState(mk);
  const [t] = useState(() => new Animated.Value(0));
  useEffect(() => {
    if (reduce) { t.setValue(0.5); return; }
    t.setValue(0);
    const a = Animated.timing(t, { toValue: 1, duration: it.ms, delay: first ? Math.random() * 2000 : Math.random() * 250, easing: Easing.linear, useNativeDriver: true });
    a.start(({ finished }) => { if (finished) setIt(mk()); });
    return () => a.stop();
  }, [it, reduce, first, mk, t]);
  // grow 100% -> 200% -> 300% while fading 0 -> 60% -> 0, drifting sideways
  const opacity = t.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0, 0.6, 0] });
  const scale = t.interpolate({ inputRange: [0, 0.5, 1], outputRange: [1, 2, 3] });
  const tx = t.interpolate({ inputRange: [0, 1], outputRange: [0, it.dx] });
  return (
    <Animated.Text style={{ position: 'absolute', left: it.left, top: it.top, color: color.paper, fontSize: it.size, fontFamily: it.code ? undefined : 'FiraSans_400Regular', opacity, transform: [{ translateX: tx }, { rotate: `${it.rot}deg` }, { scale }] }}>
      {it.text}
    </Animated.Text>
  );
}

function Bars({ reduce }: { reduce: boolean }) {
  const [vals] = useState(() => [0, 1, 2, 3, 4].map(() => new Animated.Value(0)));
  useEffect(() => {
    if (reduce) return;
    const loops = vals.map((v, i) => Animated.loop(Animated.sequence([Animated.delay(i * 120), Animated.timing(v, { toValue: 1, duration: 600, useNativeDriver: true }), Animated.timing(v, { toValue: 0, duration: 600, useNativeDriver: true })])));
    loops.forEach((l) => l.start());
    return () => loops.forEach((l) => l.stop());
  }, [reduce, vals]);
  return (
    <View style={{ flexDirection: 'row', gap: 8, alignItems: 'flex-end', height: 48 }}>
      {vals.map((v, i) => <Animated.View key={i} style={{ width: 10, height: 32, borderRadius: 2, backgroundColor: color.paper, transform: [{ translateY: v.interpolate({ inputRange: [0, 1], outputRange: [0, -8] }) }] }} />)}
    </View>
  );
}

/** Violet "thinking" screen with formulas and code drifting behind the bars while the AI works. */
export function Processing({ label = 'Processing' }: { label?: string }) {
  const [reduce, setReduce] = useState(false);
  useEffect(() => { AccessibilityInfo.isReduceMotionEnabled().then(setReduce); }, []);
  return (
    <View style={[StyleSheet.absoluteFill, { zIndex: 20, backgroundColor: color.violet, alignItems: 'center', justifyContent: 'center', gap: space[12] }]} accessibilityViewIsModal accessibilityLiveRegion="polite">
      <View style={StyleSheet.absoluteFill} pointerEvents="none" accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
        {ROWS.map((_, r) => <Item key={r} row={r} first reduce={reduce} />)}
      </View>
      <Bars reduce={reduce} />
      <Text style={[type.titleMd, { color: color.paper }]}>{label}</Text>
    </View>
  );
}
