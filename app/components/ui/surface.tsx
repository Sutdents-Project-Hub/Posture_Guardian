import { PropsWithChildren } from 'react';
import { StyleProp, StyleSheet, View, ViewStyle } from 'react-native';

import { Radius, Shadow, Spacing, type ThemePalette } from '@/constants/design';
import { useThemedStyles } from '@/hooks/use-app-theme';

type Props = PropsWithChildren<{
  style?: StyleProp<ViewStyle>;
  tone?: 'default' | 'ai' | 'amber' | 'danger' | 'dark';
}>;

export function Surface({ children, style, tone = 'default' }: Props) {
  const styles = useThemedStyles(createStyles);
  return <View style={[styles.base, styles[tone], style]}>{children}</View>;
}

const createStyles = (palette: ThemePalette) => StyleSheet.create({
  base: {
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: palette.line,
    ...Shadow,
  },
  default: { backgroundColor: palette.surface },
  ai: { backgroundColor: palette.primaryPale, borderColor: palette.primaryDark },
  amber: { backgroundColor: palette.warningPale, borderColor: palette.warning },
  danger: { backgroundColor: palette.dangerPale, borderColor: palette.danger },
  dark: { backgroundColor: '#0B1026', borderColor: '#3B4A7C' },
});
