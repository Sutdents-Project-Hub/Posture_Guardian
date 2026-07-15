import { PropsWithChildren } from 'react';
import { StyleProp, StyleSheet, View, ViewStyle } from 'react-native';

import { Palette, Radius, Shadow, Spacing } from '@/constants/design';

type Props = PropsWithChildren<{
  style?: StyleProp<ViewStyle>;
  tone?: 'default' | 'green' | 'amber' | 'danger' | 'dark';
}>;

export function Surface({ children, style, tone = 'default' }: Props) {
  return <View style={[styles.base, styles[tone], style]}>{children}</View>;
}

const styles = StyleSheet.create({
  base: {
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: Palette.line,
    ...Shadow,
  },
  default: { backgroundColor: Palette.surface },
  green: { backgroundColor: Palette.primaryPale, borderColor: '#B6D9D1' },
  amber: { backgroundColor: Palette.accentPale, borderColor: '#F0D6A8' },
  danger: { backgroundColor: Palette.warningPale, borderColor: '#F1B9A8' },
  dark: { backgroundColor: Palette.ink, borderColor: Palette.ink },
});
