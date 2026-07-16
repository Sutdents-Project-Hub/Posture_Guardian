import { StyleSheet, Text, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';

import { Typography, type ThemePalette } from '@/constants/design';
import { useAppTheme, useThemedStyles } from '@/hooks/use-app-theme';

export function ScoreGauge({
  value,
  size = 132,
  label = '姿勢分數',
  unit = '分',
}: {
  value: number | null;
  size?: number;
  label?: string;
  unit?: string;
}) {
  const { palette } = useAppTheme();
  const styles = useThemedStyles(createStyles);
  const hasValue = value !== null;
  const normalized = Math.max(0, Math.min(100, value ?? 0));
  const strokeWidth = 11;
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * Math.PI * 2;
  const dashOffset = circumference * (1 - normalized / 100);
  const color = normalized >= 75 ? palette.accent : normalized >= 50 ? palette.primary : palette.warning;

  return (
    <View
      accessibilityRole="text"
      accessibilityLabel={hasValue ? `${label} ${Math.round(normalized)} ${unit}` : `${label}尚無資料`}
      style={{ width: size, height: size }}>
      <Svg width={size} height={size} style={StyleSheet.absoluteFill}>
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={palette.surfaceMuted}
          strokeWidth={strokeWidth}
          fill="none"
        />
        {hasValue ? (
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
        ) : null}
      </Svg>
      <View style={styles.copy}>
        <Text style={[styles.value, { color: hasValue ? color : palette.inkSoft }]}>
          {hasValue ? Math.round(normalized) : '—'}
        </Text>
        <Text style={styles.label}>{label}</Text>
      </View>
    </View>
  );
}

const createStyles = (palette: ThemePalette) => StyleSheet.create({
  copy: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center' },
  value: { fontFamily: Typography.displayFamily, fontSize: 36, lineHeight: 40, fontWeight: '700' },
  label: { fontFamily: Typography.family, color: palette.inkSoft, fontSize: 11, fontWeight: '700' },
});
