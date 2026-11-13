// Design tokens from the Idealizator design system (tokens.json). Do not hand-copy hex values elsewhere.
export const color = {
  violet: '#b100d9', violetDeep: '#7d0099', violetShade: '#9a00bd', amber: '#ffb700',
  paper: '#ffffff', ink: '#252525', inkSoft: '#5c5c5c', track: '#ebebeb',
  violetTint: '#faf3fc', violetLine: '#ecd9f2', violetEdge: '#d9a6ea', field: '#f5f1f6',
  success: '#1b7a3d', successFill: '#2e9d57', warning: '#8a5a00', danger: '#b3261e', dangerFill: '#d93025',
};
export const space = { 1: 4, 2: 8, 3: 12, 4: 16, 5: 20, 6: 24, 8: 32, 10: 40, 12: 48, 16: 64, 20: 80 } as const;
export const radius = { sm: 4, md: 12, lg: 16, xl: 28, full: 9999 } as const;
export const size = { touch: 44, icon: 24, record: 74, recordHalo: 118 } as const;

export const font = {
  light: 'FiraSans_300Light_Italic', regular: 'FiraSans_400Regular', medium: 'FiraSans_500Medium',
  semi: 'FiraSans_600SemiBold', bold: 'FiraSans_700Bold_Italic',
} as const;

export const type = {
  hero: { fontFamily: font.light, fontSize: 36, lineHeight: 44 },
  titleLg: { fontFamily: font.medium, fontSize: 36, lineHeight: 44 },
  titleMd: { fontFamily: font.medium, fontSize: 22, lineHeight: 28 },
  body: { fontFamily: font.regular, fontSize: 17, lineHeight: 24 },
  bodyStrong: { fontFamily: font.medium, fontSize: 17, lineHeight: 24 },
  label: { fontFamily: font.regular, fontSize: 16, lineHeight: 20 },
  meta: { fontFamily: font.regular, fontSize: 13, lineHeight: 18 },
} as const;

/** Score bands: <40 red, 40-69 amber, >=70 green. The number is always shown too. */
export function scoreBand(score: number): 'bad' | 'medium' | 'good' {
  return score < 40 ? 'bad' : score < 70 ? 'medium' : 'good';
}
export const bandColor = { bad: color.danger, medium: color.warning, good: color.success } as const;
