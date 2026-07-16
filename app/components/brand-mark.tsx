import { StyleSheet, View } from 'react-native';

import { Radius, type ThemePalette } from '@/constants/design';
import { useAppTheme, useThemedStyles } from '@/hooks/use-app-theme';

export function BrandMark({ inverse = false }: { inverse?: boolean }) {
  const { palette } = useAppTheme();
  const styles = useThemedStyles(createStyles);
  const color = inverse ? palette.white : palette.primaryDark;
  return (
    <View accessible={false} style={[styles.frame, { borderColor: color }]}>
      <View style={styles.bars}>
        <View style={[styles.bar, styles.short, { backgroundColor: color }]} />
        <View style={[styles.bar, styles.tall, { backgroundColor: color }]} />
        <View style={[styles.bar, styles.medium, { backgroundColor: color }]} />
      </View>
      <View style={[styles.dot, { backgroundColor: palette.accent }]} />
    </View>
  );
}

const createStyles = (palette: ThemePalette) => StyleSheet.create({
  frame: {
    width: 40,
    height: 40,
    borderRadius: Radius.sm,
    borderWidth: 2,
    backgroundColor: palette.primaryPale,
    padding: 8,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
  },
  bars: { flexDirection: 'row', alignItems: 'flex-end', gap: 3 },
  bar: { width: 3, borderRadius: 0 },
  short: { height: 10 },
  medium: { height: 15 },
  tall: { height: 20 },
  dot: { width: 6, height: 6, borderRadius: 0, marginBottom: 1 },
});
