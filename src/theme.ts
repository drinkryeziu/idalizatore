// Design tokens from the Idealizator design system (tokens.json), as used by the approved prototype.
export const color = {
  violet: '#b100d9', violetDeep: '#7d0099', violetShade: '#9a00bd', amber: '#ffb700',
  paper: '#ffffff', ink: '#252525', inkSoft: '#5c5c5c', track: '#ebebeb',
  violetTint: '#faf3fc', violetLine: '#ecd9f2', violetEdge: '#d9a6ea', field: '#f5f1f6',
  success: '#1b7a3d', successFill: '#2e9d57', warning: '#8a5a00', danger: '#b3261e', dangerFill: '#d93025',
  demoBg: '#fff7df',
};
export const space = { 1: 4, 2: 8, 3: 12, 4: 16, 5: 20, 6: 24, 8: 32, 10: 40, 12: 48, 16: 64, 20: 80 } as const;
export const radius = { sm: 4, md: 12, lg: 16, xl: 28, full: 9999 } as const;
export const size = { touch: 44, icon: 24, record: 74, recordCore: 64, recordHalo: 118 } as const;

export const font = {
  light: 'FiraSans_300Light_Italic', regular: 'FiraSans_400Regular', medium: 'FiraSans_500Medium',
  semi: 'FiraSans_600SemiBold', bold: 'FiraSans_700Bold_Italic',
  hand: 'Caveat_500Medium', code: 'FiraCode_400Regular',
} as const;

const f = (fontFamily: string, fontSize: number, lineHeight: number) => ({ fontFamily, fontSize, lineHeight });
/** The prototype's type scale, by the size and weight it uses. */
export const typo = {
  hero: f(font.light, 36, 44), heroStrong: f(font.bold, 36, 44),
  pageTitle: f(font.semi, 36, 44), titleMd: f(font.medium, 22, 28), h3: f(font.medium, 17, 24),
  body19: f(font.regular, 19, 24), body19m: f(font.medium, 19, 24),
  body16: f(font.regular, 16, 24), body16m: f(font.medium, 16, 24), label16m: f(font.medium, 16, 20),
  body15: f(font.regular, 15, 22), body15m: f(font.medium, 15, 20),
  body14: f(font.regular, 14, 20), body14m: f(font.medium, 14, 20),
  meta13: f(font.regular, 13, 18), label13m: f(font.medium, 13, 18),
  small12: f(font.regular, 12, 16), tag11: f(font.medium, 11, 18), chip11: f(font.semi, 11, 16),
  nav: f(font.regular, 12, 16), button17m: f(font.medium, 17, 24),
} as const;

// Older names kept for a few helpers.
export const type = { hero: typo.hero, titleLg: typo.pageTitle, titleMd: typo.titleMd, body: typo.body16, bodyStrong: typo.body16m, label: typo.label16m, meta: typo.meta13 } as const;

/** Score bands: under 40 red, 40-69 amber, 70 and up green. The number is always shown too. */
export function scoreBand(score: number): 'bad' | 'medium' | 'good' {
  return score < 40 ? 'bad' : score < 70 ? 'medium' : 'good';
}
export const bandColor = { bad: color.danger, medium: color.warning, good: color.success } as const;
export const bandFill = { bad: color.dangerFill, medium: color.amber, good: color.successFill } as const;
