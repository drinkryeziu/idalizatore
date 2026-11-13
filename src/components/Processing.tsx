import { useCallback, useEffect, useState } from 'react';
import { AccessibilityInfo, Animated, Easing, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { color, font, space, typo } from '../theme';
import { TopBar } from './chrome';

// Formulas and code snippets drift behind the bars while the AI works (the prototype's "thinking" backdrop).
const FORMULAS = ['E = mc²', 'a² + b² = c²', '∫√(a² − x²) dx', '∇φ(x, y, z)', 'Δ = b² − 4ac', 'ax² + bx + c = 0', 'c = πr²', 'x̄ = Σxᵢ / n', 'f(x) = a(x² + (b/a)x + c/a)', 'logₐ b', 'e^(iπ) + 1 = 0', 'lim x→∞ (1 + 1/x)^x = e', '∂f/∂x + ∂f/∂y', 'P(A|B) = P(B|A)·P(A) / P(B)', 'σ = √(Σ(x − μ)² / N)', 'x = (−b ± √Δ) / 2a', 'sin²θ + cos²θ = 1', 'π ≈ 3.14159', 'ROI = (gain − cost) / cost', 'LTV > 3 × CAC', 'margin = (p − c) / p', '(x₁ + x₂) / 2', '√(16·x)', 'y = mx + b', 'A = ½·b·h', 'n! / (k!(n − k)!)', 'TAM → SAM → SOM', '46 < x', 'a ≠ 0', 'F = ma'];
const SNIPPETS = ['const score = analyze(idea);', 'def forecast(market):', 'SELECT * FROM ideas WHERE score > 80;', 'if (idea.isGood()) launch();', 'fn main() { think(); }', 'for idea in ideas: evaluate(idea)', 'let plan = await ai.plan(idea);', 'print("thinking...")', 'while (!done) refine(plan);', 'func score(_ idea: Idea) -> Int', 'return demand * fit / risk', 'market.size().segment(users)', 'console.log(insight);', 'ideas.map(i => i.score)', 'public int rate(Idea idea) {', 'echo "$idea" | analyze', 'val plan = idea.toBusinessPlan()', 'puts ideas.max_by(&:score)'];
const ROWS = [4, 12, 20, 28, 36, 64, 72, 80, 88, 94];
const pick = <T,>(a: T[]) => a[Math.floor(Math.random() * a.length)];

function Item({ row, reduce }: { row: number; reduce: boolean }) {
  const { width, height } = useWindowDimensions();
  const w = Math.min(width, 430);
  const mk = useCallback(() => {
    const code = Math.random() < 0.28;
    return { code, text: pick(code ? SNIPPETS : FORMULAS), left: (0.16 + Math.random() * 0.68) * w, top: ((ROWS[row] + Math.random() * 3 - 1.5) / 100) * height,
      size: code ? 7 + Math.random() * 2 : 11 + Math.random() * 6, rot: code ? 0 : Math.random() * 8 - 4, dx: (Math.random() < 0.5 ? -1 : 1) * (10 + Math.random() * 60), ms: 2300 + Math.random() * 1600 };
  }, [w, height, row]);
  const [it, setIt] = useState(mk);
  const [t] = useState(() => new Animated.Value(0));
  const [first, setFirst] = useState(true);
  useEffect(() => {
    if (reduce) { t.setValue(0.5); return; }
    t.setValue(0);
    const a = Animated.timing(t, { toValue: 1, duration: it.ms, delay: first ? Math.random() * 2000 : Math.random() * 250, easing: Easing.linear, useNativeDriver: true });
    a.start(({ finished }) => { if (finished) { setFirst(false); setIt(mk()); } });
    return () => a.stop();
  }, [it, reduce, first, mk, t]);
  // grow 100% -> 200% -> 300% while fading 0 -> 60% -> 0, drifting sideways
  return (
    <Animated.Text style={{ position: 'absolute', left: it.left, top: it.top, color: color.paper, fontSize: it.size, fontFamily: it.code ? font.code : font.hand,
      opacity: t.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0, 0.6, 0] }),
      transform: [{ translateX: t.interpolate({ inputRange: [0, 1], outputRange: [0, it.dx] }) }, { rotate: `${it.rot}deg` }, { scale: t.interpolate({ inputRange: [0, 0.5, 1], outputRange: [1, 2, 3] }) }] }}>
      {it.text}
    </Animated.Text>
  );
}

// The seven bars of the processing mark: [x, y, height] in a 52 by 46 box.
const BARS: [number, number, number][] = [[0, 16, 14], [8, 16, 22], [16, 30, 16], [24, 25, 15], [32, 0, 23], [40, 8, 19], [48, 16, 14]];
function Bars({ reduce }: { reduce: boolean }) {
  const [vals] = useState(() => BARS.map(() => new Animated.Value(0)));
  useEffect(() => {
    if (reduce) return;
    const loops = vals.map((v, i) => Animated.loop(Animated.sequence([Animated.delay(i * 120), Animated.timing(v, { toValue: 1, duration: 600, useNativeDriver: true }), Animated.timing(v, { toValue: 0, duration: 600, useNativeDriver: true })])));
    loops.forEach((l) => l.start());
    return () => loops.forEach((l) => l.stop());
  }, [reduce, vals]);
  return (
    <View style={{ width: 52, height: 46 }}>
      {BARS.map(([x, y, h], i) => <Animated.View key={i} style={{ position: 'absolute', left: x, top: y, width: 4, height: h, backgroundColor: color.paper, transform: [{ translateY: vals[i].interpolate({ inputRange: [0, 1], outputRange: [0, -8] }) }] }} />)}
    </View>
  );
}

/** Violet "thinking" screen with formulas and code drifting in and out behind the processing bars. */
export function Processing({ label = 'Processing' }: { label?: string }) {
  const [reduce, setReduce] = useState(false);
  useEffect(() => { AccessibilityInfo.isReduceMotionEnabled().then(setReduce); }, []);
  return (
    <View style={[StyleSheet.absoluteFill, { zIndex: 8, backgroundColor: color.violet, alignItems: 'center', justifyContent: 'center', gap: space[12] }]} accessibilityLiveRegion="polite">
      <View style={StyleSheet.absoluteFill} pointerEvents="none" accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
        {ROWS.map((_, r) => <Item key={r} row={r} reduce={reduce} />)}
      </View>
      <TopBar tone="violet" float />
      <Bars reduce={reduce} />
      <Text accessibilityRole="alert" style={[typo.body19m, { color: color.paper }]}>{label}</Text>
    </View>
  );
}
