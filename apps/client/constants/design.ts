import { Platform } from 'react-native';

export const Palette = {
  canvas: '#F4F2E9',
  surface: '#FFFFFF',
  surfaceMuted: '#E8EEE9',
  ink: '#102B2B',
  inkSoft: '#536664',
  primary: '#0C716A',
  primaryDark: '#07514D',
  primaryPale: '#D9ECE7',
  accent: '#F0B45F',
  accentPale: '#FFF0D6',
  success: '#277C62',
  warning: '#C84E35',
  warningPale: '#FBE4DB',
  line: '#D8E0DA',
  white: '#FFFFFF',
  overlay: 'rgba(7, 31, 31, 0.72)',
} as const;

export const Typography = {
  family: Platform.select({
    ios: 'system-ui',
    android: 'sans-serif',
    web: "Inter, 'Noto Sans TC', 'PingFang TC', system-ui, sans-serif",
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
  sm: 10,
  md: 16,
  lg: 24,
  pill: 999,
} as const;

export const Shadow = Platform.select({
  web: {
    boxShadow: '0 12px 40px rgba(14, 50, 48, 0.08)',
  },
  default: {
    shadowColor: '#102B2B',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 18,
    elevation: 3,
  },
});
