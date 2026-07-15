import { Platform } from 'react-native';

export const DarkPalette = {
  canvas: '#070A1A',
  canvasRaised: '#0B1026',
  surface: '#10172F',
  surfaceMuted: '#192241',
  surfaceStrong: '#202A4F',
  ink: '#F7F8FF',
  inkSoft: '#A7B0CF',
  primary: '#4F46E5',
  primaryDark: '#C4B5FD',
  primaryPale: '#251F50',
  secondary: '#A78BFA',
  accent: '#38BDF8',
  accentPale: '#102A46',
  success: '#38BDF8',
  warning: '#F59E0B',
  warningPale: '#3B2714',
  danger: '#BE123C',
  dangerPale: '#3A1725',
  line: '#27335C',
  lineBright: '#3B4A7C',
  white: '#FFFFFF',
  overlay: 'rgba(3, 6, 20, 0.84)',
  warningText: '#FCD38D',
  warningTextSoft: '#E8C98B',
  dangerText: '#FDA4AF',
  dangerTextSoft: '#FECDD3',
  onDarkAccent: '#38BDF8',
} as const;

export type ThemePalette = { [Key in keyof typeof DarkPalette]: string };

export const LightPalette: ThemePalette = {
  canvas: '#F6F7FF',
  canvasRaised: '#EEF1FF',
  surface: '#FFFFFF',
  surfaceMuted: '#E9EDFA',
  surfaceStrong: '#DDE4F7',
  ink: '#11152E',
  inkSoft: '#5B647E',
  primary: '#4F46E5',
  primaryDark: '#312E81',
  primaryPale: '#E9E7FF',
  secondary: '#7C3AED',
  accent: '#0369A1',
  accentPale: '#E0F2FE',
  success: '#0369A1',
  warning: '#B45309',
  warningPale: '#FFF4DC',
  danger: '#BE123C',
  dangerPale: '#FFF1F2',
  line: '#DCE1F2',
  lineBright: '#BBC5E1',
  white: '#FFFFFF',
  overlay: 'rgba(3, 6, 20, 0.84)',
  warningText: '#92400E',
  warningTextSoft: '#A16207',
  dangerText: '#9F1239',
  dangerTextSoft: '#BE123C',
  onDarkAccent: '#38BDF8',
};

export const DarkGradients = {
  primary: ['#7C3AED', '#4F46E5'] as const,
  ai: ['#7C3AED', '#4F46E5', '#0284C7'] as const,
  ambient: ['rgba(124, 92, 252, 0.23)', 'rgba(56, 189, 248, 0.04)', 'rgba(7, 10, 26, 0)'] as const,
  surface: ['rgba(32, 42, 79, 0.92)', 'rgba(16, 23, 47, 0.96)'] as const,
} as const;

export type ThemeGradients = {
  primary: readonly [string, string];
  ai: readonly [string, string, string];
  ambient: readonly [string, string, string];
  surface: readonly [string, string];
};

export const LightGradients: ThemeGradients = {
  primary: ['#7C3AED', '#4F46E5'],
  ai: ['#6D28D9', '#4F46E5', '#0369A1'],
  ambient: ['rgba(79, 70, 229, 0.13)', 'rgba(3, 105, 161, 0.04)', 'rgba(246, 247, 255, 0)'],
  surface: ['rgba(255, 255, 255, 0.98)', 'rgba(238, 241, 255, 0.98)'],
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
  sm: 12,
  md: 18,
  lg: 26,
  pill: 999,
} as const;

export const Shadow = Platform.select({
  web: {
    boxShadow: '0 18px 50px rgba(2, 6, 23, 0.32)',
  },
  default: {
    shadowColor: '#020617',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.28,
    shadowRadius: 22,
    elevation: 6,
  },
});
