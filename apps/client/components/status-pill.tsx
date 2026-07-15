import { StyleSheet, Text, View } from 'react-native';

import { Palette, Radius, Spacing, Typography } from '@/constants/design';

type Tone = 'success' | 'warning' | 'neutral' | 'info';

export function StatusPill({ label, tone = 'neutral' }: { label: string; tone?: Tone }) {
  return (
    <View style={[styles.base, styles[`${tone}Background`]]}>
      <View style={[styles.dot, styles[`${tone}Dot`]]} />
      <Text style={[styles.label, styles[`${tone}Text`]]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: 32,
    borderRadius: Radius.pill,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.sm,
    gap: 7,
  },
  dot: { width: 7, height: 7, borderRadius: 4 },
  label: { fontFamily: Typography.family, fontSize: Typography.caption, fontWeight: '800' },
  successBackground: { backgroundColor: Palette.primaryPale },
  warningBackground: { backgroundColor: Palette.warningPale },
  neutralBackground: { backgroundColor: Palette.surfaceMuted },
  infoBackground: { backgroundColor: Palette.accentPale },
  successDot: { backgroundColor: Palette.success },
  warningDot: { backgroundColor: Palette.warning },
  neutralDot: { backgroundColor: Palette.inkSoft },
  infoDot: { backgroundColor: Palette.accent },
  successText: { color: Palette.primaryDark },
  warningText: { color: '#8C331F' },
  neutralText: { color: Palette.inkSoft },
  infoText: { color: '#745018' },
});
