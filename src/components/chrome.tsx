import { ReactNode, useEffect, useState } from 'react';
import { Animated, Easing, LayoutChangeEvent, Platform, Pressable, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Polyline, SvgXml } from 'react-native-svg';
import { MIC_START, MIC_STOP } from '../recordArt';
import { color, font, space, typo } from '../theme';
import { useApp } from '../store';
import { Logo } from './Icon';
import { IconBtn } from './ui';

/** The prototype's screen: violet or paper ground with 16 px padding. */
export function Screen({ tone = 'paper', children, flush }: { tone?: 'violet' | 'paper'; children: ReactNode; flush?: boolean }) {
  return (
    <SafeAreaView edges={flush ? ['top', 'left', 'right'] : undefined} style={{ flex: 1, backgroundColor: tone === 'violet' ? color.violet : color.paper }}>
      <View style={{ flex: 1, padding: space[4], paddingBottom: flush ? 0 : space[4] }}>{children}</View>
    </SafeAreaView>
  );
}

/** Back on the left; on the right an optional "record more" mic, then the menu (or a close X on pages like Settings). */
export function TopBar({ onBack, onMic, micLabel, onClose, tone = 'paper', float }: { onBack?: () => void; onMic?: () => void; micLabel?: string; onClose?: () => void; tone?: 'violet' | 'paper'; float?: boolean }) {
  const setMenu = useApp((s) => s.setMenu);
  const tint = tone === 'violet' ? color.paper : color.violet;
  return (
    <View style={[{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: 44, paddingTop: 4 }, float ? { position: 'absolute', zIndex: 4, top: space[4], left: space[4], right: space[4] } : null]}>
      {onBack ? <IconBtn name="arrow-left" label="Back" onPress={onBack} tint={tint} /> : <View style={{ width: 44, height: 44 }} />}
      <View style={{ flexDirection: 'row' }}>
        {onMic ? <IconBtn name="mic-filled" label={micLabel || 'Record'} onPress={onMic} tint={tint} /> : null}
        {onClose ? <IconBtn name="x" label="Close" onPress={onClose} tint={tint} /> : <IconBtn name="menu" label="Open menu" onPress={() => setMenu(true)} tint={tint} />}
      </View>
    </View>
  );
}

export const Em = ({ children }: { children: ReactNode }) => <Text style={{ fontFamily: font.bold }}>{children}</Text>;

/** Logo mark above a light italic headline with bold italic emphasis. */
export function Hero({ children, markSize = 60, padLeft = 80, fontSize }: { children: ReactNode; markSize?: number; padLeft?: number; fontSize?: number }) {
  return (
    <View style={{ paddingLeft: padLeft }}>
      <View style={{ marginBottom: space[3] }}><Logo size={markSize} color={color.paper} /></View>
      <Text accessibilityRole="header" style={[typo.hero, { color: color.paper }, fontSize ? { fontSize, lineHeight: fontSize + 8 } : null]}>{children}</Text>
    </View>
  );
}

/** Record button from the Figma "Start / Stop" mockup: a violet mic (press to record) that turns red (press to stop). */
export function RecordButton({ recording, label, ...press }: { recording: boolean; tone?: 'violet' | 'paper'; label: string; onPress?: () => void }) {
  // The art is 110 px (start) or 96 px (stop) wide around a 64 px disc; these offsets centre the disc in the 64 px slot.
  const art = recording ? { xml: MIC_STOP, w: 96, left: -16, top: -20 } : { xml: MIC_START, w: 110, left: -23, top: -15 };
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={label} accessibilityState={{ selected: recording }} {...press}
      style={[{ width: 64, height: 64 }, Platform.OS === 'web' ? ({ userSelect: 'none', touchAction: 'none', cursor: 'pointer' } as any) : null]}>
      <View pointerEvents="none" style={{ position: 'absolute', left: art.left, top: art.top, width: art.w, height: art.w }}>
        <SvgXml xml={art.xml} width={art.w} height={art.w} />
      </View>
    </Pressable>
  );
}

const WAVE = [0.62, 0.88, 0.14, 0.95, 0.3, 0.7, 0.04, 1, 0.22, 0.6, 0.36, 0.55, 0.06, 0.78, 0.2, 0.92, 0.1, 0.66];
/** The scrolling violet-shade zig-zag shown while recording. */
export function Waveform({ height = 160 }: { height?: number }) {
  const [w, setW] = useState(0);
  const [x] = useState(() => new Animated.Value(0));
  useEffect(() => {
    if (!w) return;
    x.setValue(0);
    const a = Animated.loop(Animated.timing(x, { toValue: -w, duration: 2400, easing: Easing.linear, useNativeDriver: true }));
    a.start();
    return () => a.stop();
  }, [w, x]);
  const VB = 430, pad = 8, step = VB / WAVE.length;
  const pts: string[] = [];
  for (let r = 0; r < 2; r++) for (let i = 0; i < WAVE.length; i++) pts.push(`${(r * VB + i * step).toFixed(1)},${(pad + (1 - WAVE[i]) * (height - pad * 2)).toFixed(1)}`);
  pts.push(`${2 * VB},${(pad + (1 - WAVE[0]) * (height - pad * 2)).toFixed(1)}`);
  return (
    <View onLayout={(e: LayoutChangeEvent) => setW(e.nativeEvent.layout.width)} style={{ width: '100%', height, overflow: 'hidden' }} pointerEvents="none" accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      {w ? (
        <Animated.View style={{ width: w * 2, height, transform: [{ translateX: x }] }}>
          <Svg width={w * 2} height={height} viewBox={`0 0 ${2 * VB} ${height}`} preserveAspectRatio="none">
            <Polyline points={pts.join(' ')} fill="none" stroke={color.violetShade} strokeWidth={15} strokeLinejoin="miter" strokeMiterlimit={2} />
          </Svg>
        </Animated.View>
      ) : null}
    </View>
  );
}
