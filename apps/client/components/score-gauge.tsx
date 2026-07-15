import { StyleSheet, Text, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';

import { Palette, Typography } from '@/constants/design';

export function ScoreGauge({
  value,
  size = 132,
  label = '姿勢分數',
}: {
  value: number;
  size?: number;
  label?: string;
}) {
  const normalized = Math.max(0, Math.min(100, value));
  const strokeWidth = 11;
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * Math.PI * 2;
  const dashOffset = circumference * (1 - normalized / 100);
  const color = normalized >= 75 ? Palette.primary : normalized >= 50 ? Palette.accent : Palette.warning;

  return (
    <View
      accessibilityRole="text"
      accessibilityLabel={`${label} ${Math.round(normalized)} 分`}
      style={{ width: size, height: size }}>
      <Svg width={size} height={size} style={StyleSheet.absoluteFill}>
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={Palette.surfaceMuted}
          strokeWidth={strokeWidth}
          fill="none"
        />
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={`${circumference} ${circumference}`}
          strokeDashoffset={dashOffset}
          fill="none"
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </Svg>
      <View style={styles.copy}>
        <Text style={[styles.value, { color }]}>{Math.round(normalized)}</Text>
        <Text style={styles.label}>{label}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  copy: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center' },
  value: { fontFamily: Typography.family, fontSize: 36, lineHeight: 40, fontWeight: '900' },
  label: { fontFamily: Typography.family, color: Palette.inkSoft, fontSize: 11, fontWeight: '700' },
});
