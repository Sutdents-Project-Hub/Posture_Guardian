import { StyleSheet, Text, View } from 'react-native';

import { Radius, Spacing, Typography, type ThemePalette } from '@/constants/design';
import { useThemedStyles } from '@/hooks/use-app-theme';

type Tone = 'success' | 'warning' | 'neutral' | 'info';

export function StatusPill({ label, tone = 'neutral' }: { label: string; tone?: Tone }) {
  const styles = useThemedStyles(createStyles);
  return (
    <View style={[styles.base, styles[`${tone}Background`]]}>
      <View style={[styles.dot, styles[`${tone}Dot`]]} />
      <Text style={[styles.label, styles[`${tone}Text`]]}>{label}</Text>
    </View>
  );
}

const createStyles = (palette: ThemePalette) => StyleSheet.create({
  base: {
    minHeight: 32,
    borderRadius: Radius.pill,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.sm,
    gap: 7,
    borderWidth: 1,
    borderColor: palette.line,
  },
  dot: { width: 7, height: 7, borderRadius: 4 },
  label: { fontFamily: Typography.family, fontSize: Typography.caption, fontWeight: '800' },
  successBackground: { backgroundColor: palette.primaryPale },
  warningBackground: { backgroundColor: palette.warningPale },
  neutralBackground: { backgroundColor: palette.surfaceMuted },
  infoBackground: { backgroundColor: palette.accentPale },
  successDot: { backgroundColor: palette.success },
  warningDot: { backgroundColor: palette.warning },
  neutralDot: { backgroundColor: palette.inkSoft },
  infoDot: { backgroundColor: palette.accent },
  successText: { color: palette.accent },
  warningText: { color: palette.warningText },
  neutralText: { color: palette.inkSoft },
  infoText: { color: palette.primaryDark },
});
