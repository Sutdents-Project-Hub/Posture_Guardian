import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Line, Path } from 'react-native-svg';

import { Radius, Spacing, Typography, type ThemePalette } from '@/constants/design';
import { useAppTheme, useThemedStyles } from '@/hooks/use-app-theme';
import { formatDate } from '@/lib/format';
import type { SessionSummary } from '@/types/posture';

export function ImprovementTrend({ sessions }: { sessions: SessionSummary[] }) {
  const { palette } = useAppTheme();
  const styles = useThemedStyles(createStyles);
  const [width, setWidth] = useState(0);
  const chartWidth = Math.max(width, 260);
  const height = 152;
  const inset = 18;
  const values = sessions.map((item) => Math.max(0, Math.min(100, item.good_posture_rate)));
  const x = (index: number) =>
    values.length <= 1 ? chartWidth / 2 : inset + (index * (chartWidth - inset * 2)) / (values.length - 1);
  const y = (value: number) => inset + ((100 - value) / 100) * (height - inset * 2);
  const path = values.map((value, index) => `${index ? 'L' : 'M'} ${x(index)} ${y(value)}`).join(' ');
  const summary = sessions.length
    ? sessions
        .map((item) => `${formatDate(item.started_at)} ${Math.round(item.good_posture_rate)}%`)
        .join('、')
    : '尚無工作階段資料';

  return (
    <View
      accessibilityRole="image"
      accessibilityLabel={`最近工作階段良好坐姿率趨勢：${summary}`}
      onLayout={(event) => setWidth(event.nativeEvent.layout.width)}
      style={styles.frame}>
      {sessions.length ? (
        <>
          <Svg width="100%" height={height} viewBox={`0 0 ${chartWidth} ${height}`}>
            {[25, 50, 75].map((value) => (
              <Line
                key={value}
                x1={inset}
                x2={chartWidth - inset}
                y1={y(value)}
                y2={y(value)}
                stroke={palette.line}
                strokeWidth="1"
                strokeDasharray="5 7"
              />
            ))}
            {path ? (
              <Path
                d={path}
                fill="none"
                stroke={palette.accent}
                strokeWidth="4"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            ) : null}
            {values.map((value, index) => (
              <Circle
                key={`${sessions[index].id}-${index}`}
                cx={x(index)}
                cy={y(value)}
                r="5.5"
                fill={palette.canvas}
                stroke={index === values.length - 1 ? palette.secondary : palette.accent}
                strokeWidth="3"
              />
            ))}
          </Svg>
          <View style={styles.values} accessible={false}>
            {values.map((value, index) => (
              <Text key={`${sessions[index].id}-label`} style={styles.value}>
                {Math.round(value)}%
              </Text>
            ))}
          </View>
        </>
      ) : (
        <View style={styles.empty}>
          <Text style={styles.emptyTitle}>趨勢等待第一筆資料</Text>
          <Text style={styles.emptyText}>完成工作階段後才會繪圖，不會用展示數值冒充真實結果。</Text>
        </View>
      )}
    </View>
  );
}

const createStyles = (palette: ThemePalette) => StyleSheet.create({
  frame: {
    minHeight: 190,
    borderRadius: Radius.md,
    backgroundColor: palette.canvasRaised,
    borderWidth: 1,
    borderColor: palette.line,
    paddingTop: Spacing.sm,
    overflow: 'hidden',
  },
  values: {
    minHeight: 38,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    borderTopWidth: 1,
    borderTopColor: palette.line,
    paddingHorizontal: Spacing.xs,
  },
  value: { color: palette.inkSoft, fontFamily: Typography.family, fontSize: 11, fontWeight: '800' },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: Spacing.xl, gap: Spacing.xs },
  emptyTitle: { color: palette.ink, fontFamily: Typography.family, fontSize: Typography.body, fontWeight: '900' },
  emptyText: { color: palette.inkSoft, fontFamily: Typography.family, fontSize: Typography.caption, lineHeight: 19, textAlign: 'center' },
});
