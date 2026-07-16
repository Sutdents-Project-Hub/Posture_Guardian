import { Platform } from 'react-native';

export const DarkPalette = {
  canvas: '#171815',
  canvasRaised: '#1D1F1B',
  surface: '#242620',
  surfaceMuted: '#2E302A',
  surfaceStrong: '#393B34',
  ink: '#F4EEDF',
  inkSoft: '#BDB5A6',
  primary: '#E07A55',
  primaryDark: '#F0B59F',
  primaryPale: '#422B23',
  secondary: '#D6AA55',
  accent: '#B7C8D2',
  accentPale: '#283238',
  success: '#B7C8D2',
  warning: '#D6AA55',
  warningPale: '#3B3020',
  danger: '#B95143',
  dangerPale: '#3B2421',
  line: '#464840',
  lineBright: '#747267',
  white: '#FFF9EF',
  overlay: 'rgba(18, 19, 17, 0.88)',
  warningText: '#F1CC82',
  warningTextSoft: '#DCC48F',
  dangerText: '#F0A095',
  dangerTextSoft: '#E0B2AB',
  onDarkAccent: '#F0C36E',
  onPrimary: '#251812',
  heroInk: '#211B16',
  heroInkSoft: '#34231B',
  inverseSurface: '#20272A',
  inverseLine: '#69767A',
} as const;

export type ThemePalette = { [Key in keyof typeof DarkPalette]: string };

export const LightPalette: ThemePalette = {
  canvas: '#F3EEE3',
  canvasRaised: '#EAE3D6',
  surface: '#FFF9EE',
  surfaceMuted: '#E8E0D2',
  surfaceStrong: '#D8CDBD',
  ink: '#25231E',
  inkSoft: '#6B665D',
  primary: '#A94730',
  primaryDark: '#773324',
  primaryPale: '#F1D6C8',
  secondary: '#C58D2D',
  accent: '#2D4355',
  accentPale: '#DCE3E5',
  success: '#2D4355',
  warning: '#A96E12',
  warningPale: '#F5E6BD',
  danger: '#A74438',
  dangerPale: '#F3D9D4',
  line: '#CFC4B4',
  lineBright: '#777268',
  white: '#FFF9EF',
  overlay: 'rgba(31, 30, 26, 0.88)',
  warningText: '#714A0D',
  warningTextSoft: '#795D26',
  dangerText: '#7C2F27',
  dangerTextSoft: '#88483F',
  onDarkAccent: '#F0C36E',
  onPrimary: '#FFF9EF',
  heroInk: '#211B16',
  heroInkSoft: '#34231B',
  inverseSurface: '#20272A',
  inverseLine: '#69767A',
};

export const DarkGradients = {
  primary: ['#E07A55', '#C95F42'] as const,
  ai: ['#D17852', '#D28A57', '#CFA14B'] as const,
  ambient: ['rgba(224, 122, 85, 0.12)', 'rgba(214, 170, 85, 0.035)', 'rgba(23, 24, 21, 0)'] as const,
  surface: ['rgba(57, 59, 52, 0.98)', 'rgba(36, 38, 32, 0.99)'] as const,
} as const;

export type ThemeGradients = {
  primary: readonly [string, string];
  ai: readonly [string, string, string];
  ambient: readonly [string, string, string];
  surface: readonly [string, string];
};

export const LightGradients: ThemeGradients = {
  primary: ['#B84E34', '#A94730'],
  ai: ['#D17852', '#D28A57', '#CFA14B'],
  ambient: ['rgba(185, 79, 51, 0.10)', 'rgba(197, 141, 45, 0.035)', 'rgba(243, 238, 227, 0)'],
  surface: ['rgba(255, 249, 238, 0.99)', 'rgba(234, 227, 214, 0.99)'],
};

// 保留預設匯出給尚未遷移的非互動程式；畫面請透過 useAppTheme 取得動態 token。
export const Palette: ThemePalette = DarkPalette;
export const Gradients: ThemeGradients = DarkGradients;

export const Typography = {
  family: Platform.select({
    ios: 'Avenir Next',
    android: 'sans-serif',
    web: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Noto Sans TC', sans-serif",
  }),
  displayFamily: Platform.select({
    ios: 'Georgia',
    android: 'serif',
    web: "Georgia, 'Noto Serif TC', 'Times New Roman', serif",
  }),
  display: 40,
  h1: 30,
  h2: 22,
  h3: 18,
  body: 16,
  small: 14,
  caption: 12,
} as const;

export const Spacing = {
  xxs: 4,
  xs: 8,
  sm: 12,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
} as const;

export const Radius = {
  sm: 2,
  md: 4,
  lg: 6,
  pill: 4,
} as const;

export const Shadow = Platform.select({
  web: {
    boxShadow: '4px 4px 0 rgba(35, 32, 27, 0.16)',
  },
  default: {
    shadowColor: '#171815',
    shadowOffset: { width: 3, height: 3 },
    shadowOpacity: 0.16,
    shadowRadius: 0,
    elevation: 2,
  },
});
