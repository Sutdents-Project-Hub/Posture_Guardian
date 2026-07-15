import { StyleSheet, View } from 'react-native';

import { Palette, Radius } from '@/constants/design';

export function BrandMark({ inverse = false }: { inverse?: boolean }) {
  const color = inverse ? Palette.white : Palette.primary;
  return (
    <View accessible={false} style={[styles.frame, { borderColor: color }]}>
      <View style={styles.bars}>
        <View style={[styles.bar, styles.short, { backgroundColor: color }]} />
        <View style={[styles.bar, styles.tall, { backgroundColor: color }]} />
        <View style={[styles.bar, styles.medium, { backgroundColor: color }]} />
      </View>
      <View style={[styles.dot, { backgroundColor: Palette.accent }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  frame: {
    width: 40,
    height: 40,
    borderRadius: 13,
    borderWidth: 2,
    padding: 8,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
  },
  bars: { flexDirection: 'row', alignItems: 'flex-end', gap: 3 },
  bar: { width: 3, borderRadius: Radius.pill },
  short: { height: 10 },
  medium: { height: 15 },
  tall: { height: 20 },
  dot: { width: 6, height: 6, borderRadius: 3, marginBottom: 1 },
});
