import Svg, { Path, Rect } from 'react-native-svg';
import { color as tokens } from '../theme';

// The design system's icon set (stroke icons, plus filled ones for the microphone and sparkles).
type Def = { sw?: number; paths?: string[]; fills?: string[] };
const ICONS = {
  menu: { sw: 3, paths: ['M3.5 4h17', 'M3.5 12h17', 'M3.5 20h17'] },
  'arrow-left': { sw: 2.5, paths: ['M21 12H3', 'M11 20l-8-8 8-8'] },
  mic: { paths: ['M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z', 'M19 10v2a7 7 0 0 1-14 0v-2', 'M12 19v3'] },
  'mic-filled': { fills: ['M12 1a4.5 4.5 0 0 0-4.5 4.5v5a4.5 4.5 0 0 0 9 0v-5A4.5 4.5 0 0 0 12 1Z'], paths: ['M4.5 10.5v.5a7.5 7.5 0 0 0 15 0v-.5', 'M12 18.5V22', 'M8 22h8'] },
  'chevron-down': { paths: ['m3 7.5 9 9 9-9'] },
  'chevron-up': { paths: ['m3 16.5 9-9 9 9'] },
  plus: { paths: ['M5 12h14', 'M12 5v14'] },
  'square-pen': { paths: ['M12 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7', 'M18.375 2.625a1 1 0 0 1 3 3l-9.013 9.014a2 2 0 0 1-.853.505l-2.873.84a.5.5 0 0 1-.62-.62l.84-2.873a2 2 0 0 1 .506-.852z'] },
  x: { paths: ['M18 6 6 18', 'm6 6 12 12'] },
  alert: { paths: ['M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18Z', 'M12 8v5', 'M12 16h.01'] },
  list: { paths: ['M8 6h13', 'M8 12h13', 'M8 18h13', 'M3 6h.01', 'M3 12h.01', 'M3 18h.01'] },
  chart: { paths: ['M3 3v16a2 2 0 0 0 2 2h16', 'M18 17V9', 'M13 17V5', 'M8 17v-3'] },
  sliders: { paths: ['M21 4h-7', 'M10 4H3', 'M21 12h-9', 'M8 12H3', 'M21 20h-5', 'M12 20H3', 'M14 2v4', 'M8 10v4', 'M16 18v4'] },
  user: { paths: ['M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2', 'M12 3a4 4 0 1 0 0 8 4 4 0 0 0 0-8Z'] },
  phone: { paths: ['M7 2h10a2 2 0 0 1 2 2v16a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2Z', 'M12 18h.01'] },
  cloud: { paths: ['M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9Z'] },
  layers: { paths: ['M12.83 2.18a2 2 0 0 0-1.66 0L2.6 6.08a1 1 0 0 0 0 1.83l8.58 3.91a2 2 0 0 0 1.66 0l8.58-3.9a1 1 0 0 0 0-1.83Z', 'm22 17.65-9.17 4.16a2 2 0 0 1-1.66 0L2 17.65', 'm22 12.65-9.17 4.16a2 2 0 0 1-1.66 0L2 12.65'] },
  check: { paths: ['M20 6 9 17l-5-5'] },
  right: { paths: ['m9 18 6-6-6-6'] },
  out: { paths: ['M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4', 'm16 17 5-5-5-5', 'M21 12H9'] },
  down: { paths: ['M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4', 'm7 10 5 5 5-5', 'M12 15V3'] },
  lock: { paths: ['M5 11h14a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2Z', 'M7 11V7a5 5 0 0 1 10 0v4'] },
  sparkles: { fills: ['M15 5.5Q17.55 10.95 23 13.5Q17.55 16.05 15 21.5Q12.45 16.05 7 13.5Q12.45 10.95 15 5.5Z', 'M6 2.3Q7.02 4.48 9.2 5.5Q7.02 6.52 6 8.7Q4.98 6.52 2.8 5.5Q4.98 4.48 6 2.3Z', 'M5 16Q5.64 17.36 7 18Q5.64 18.64 5 20Q4.36 18.64 3 18Q4.36 17.36 5 16Z'] },
  card: { paths: ['M4 5h16a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2Z', 'M2 10h20'] },
  external: { paths: ['M7 17 17 7', 'M8 7h9v9'] },
  mail: { paths: ['M4 4h16a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2Z', 'm22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7'] },
  printer: { paths: ['M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2', 'M6 9V3a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v6', 'M7 14h10a1 1 0 0 1 1 1v6a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1v-6a1 1 0 0 1 1-1Z'] },
} satisfies Record<string, Def>;
export type IconName = keyof typeof ICONS;

export function Icon({ name, size = 24, color = 'currentColor', strokeWidth }: { name: IconName; size?: number; color?: string; strokeWidth?: number }) {
  const def = ICONS[name] as Def;
  const c = color === 'currentColor' ? tokens.ink : color;
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth={def.sw ?? strokeWidth ?? 2} strokeLinecap="round" strokeLinejoin="round">
      {(def.fills ?? []).map((d, i) => <Path key={`f${i}`} d={d} fill={c} stroke="none" />)}
      {(def.paths ?? []).map((d, i) => <Path key={`p${i}`} d={d} />)}
    </Svg>
  );
}

/** The Idealizator mark: five bars and a sparkle. */
export function Logo({ size = 60, color = tokens.paper }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={Math.round((size * 124) / 120)} viewBox="0 0 120 124" fill={color} accessibilityLabel="Idealizator">
      <Rect x={0} y={57} width={11} height={22} />
      <Rect x={25} y={34} width={10} height={67} />
      <Rect x={49} y={12} width={11} height={112} />
      <Rect x={74} y={45} width={10} height={56} />
      <Rect x={98} y={57} width={11} height={22} />
      <Path d="M97.5 0Q104.5 15 119.5 22Q104.5 29 97.5 44Q90.5 29 75.5 22Q90.5 15 97.5 0Z" />
    </Svg>
  );
}
