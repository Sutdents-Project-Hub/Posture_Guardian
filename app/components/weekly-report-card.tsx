import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { StyleSheet, Text, View } from 'react-native';

import { Surface } from '@/components/ui/surface';
import { Radius, Spacing, Typography, type ThemePalette } from '@/constants/design';
import { useAppTheme, useThemedStyles } from '@/hooks/use-app-theme';
import { formatDuration } from '@/lib/format';
import type { WeeklyReport } from '@/types/posture';

const STATUS_META = [
  { key: 'good_seconds', label: '良好', color: 'success' },
  { key: 'attention_seconds', label: '注意', color: 'warning' },
  { key: 'poor_seconds', label: '持續偏移', color: 'danger' },
  { key: 'invalid_seconds', label: '無效', color: 'lineBright' },
] as const;

export function WeeklyReportCard({ report }: { report: WeeklyReport | null }) {
  const { palette } = useAppTheme();
  const styles = useThemedStyles(createStyles);

  if (!report) {
    return (
      <Surface style={styles.card}>
        <Text style={styles.kicker}>本週坐姿報告</Text>
        <Text style={styles.title}>週報等待有效資料</Text>
        <Text style={styles.body}>完成正式觀察後，系統會以去識別樣本整理狀態分布與容易偏移的時段。</Text>
      </Surface>
    );
  }

  const total =
    report.good_seconds +
    report.attention_seconds +
    report.poor_seconds +
    report.invalid_seconds;
  const dateRange = `${formatReportDate(report.period_start)} — ${formatReportDate(report.period_end)}`;

  return (
    <Surface style={styles.card}>
      <View style={styles.heading}>
        <View style={styles.headingCopy}>
          <Text style={styles.kicker}>本週坐姿報告</Text>
          <Text style={styles.title}>{dateRange}</Text>
          <Text style={styles.body}>
            {report.session_count} 次觀察 · 有效 {formatDuration(report.valid_seconds)} · 提醒 {report.reminder_count} 次
          </Text>
        </View>
        <View style={styles.rateBadge}>
          <Text style={styles.rateValue}>{Math.round(report.good_posture_rate)}%</Text>
          <Text style={styles.rateLabel}>良好坐姿率</Text>
        </View>
      </View>

      <View
        accessibilityRole="image"
        accessibilityLabel={`本週狀態：良好 ${formatDuration(report.good_seconds)}，注意 ${formatDuration(report.attention_seconds)}，持續偏移 ${formatDuration(report.poor_seconds)}，無效 ${formatDuration(report.invalid_seconds)}`}
        style={styles.distribution}>
        {STATUS_META.map((item) => {
          const seconds = report[item.key];
          return (
            <View
              key={item.key}
              style={[
                styles.segment,
                {
                  width: `${total ? (seconds / total) * 100 : 0}%`,
                  backgroundColor: palette[item.color],
                },
              ]}
            />
          );
        })}
      </View>
      <View style={styles.legend}>
        {STATUS_META.map((item) => (
          <View key={item.key} style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: palette[item.color] }]} />
            <Text style={styles.legendLabel}>{item.label}</Text>
            <Text style={styles.legendValue}>{formatDuration(report[item.key])}</Text>
          </View>
        ))}
      </View>

      <View style={styles.periodSection}>
        <Text style={styles.sectionTitle}>容易偏移的時段</Text>
        <View style={styles.periodGrid}>
          {report.time_periods.map((period) => (
            <View key={period.period} style={styles.period}>
              <View style={styles.periodHeading}>
                <Text style={styles.periodLabel}>{period.label}</Text>
                <Text style={styles.periodRate}>
                  {period.valid_seconds ? `${Math.round(period.good_posture_rate)}%` : '—'}
                </Text>
              </View>
              <View style={styles.periodTrack}>
                <View
                  style={[
                    styles.periodFill,
                    { width: `${period.valid_seconds ? period.good_posture_rate : 0}%` },
                  ]}
                />
              </View>
              <Text style={styles.periodMeta}>
                {period.valid_seconds
                  ? `有效 ${formatDuration(period.valid_seconds)} · 提醒 ${period.reminder_count} 次`
                  : '本週尚無有效資料'}
              </Text>
            </View>
          ))}
        </View>
      </View>

      {report.insight_text ? (
        <View style={styles.insight}>
          <MaterialIcons name="auto-awesome" size={20} color={palette.accent} />
          <View style={styles.insightCopy}>
            <Text style={styles.insightLabel}>
              {report.insight_provider === 'liangjie' ? '量界智算週建議' : '規則式週建議'}
            </Text>
            <Text style={styles.insightText}>{report.insight_text}</Text>
          </View>
        </View>
      ) : null}
    </Surface>
  );
}

function formatReportDate(value: string): string {
  return new Intl.DateTimeFormat('zh-TW', { month: 'numeric', day: 'numeric' }).format(new Date(value));
}

const createStyles = (palette: ThemePalette) => StyleSheet.create({
  card: { gap: Spacing.md },
  heading: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  headingCopy: { flex: 1, gap: 4 },
  kicker: { fontFamily: Typography.family, color: palette.primary, fontSize: Typography.caption, fontWeight: '900', letterSpacing: 0.8 },
  title: { fontFamily: Typography.displayFamily, color: palette.ink, fontSize: Typography.h3, fontWeight: '700' },
  body: { fontFamily: Typography.family, color: palette.inkSoft, fontSize: Typography.caption, lineHeight: 19 },
  rateBadge: { minWidth: 92, alignItems: 'flex-end', padding: Spacing.sm, borderRadius: Radius.md, backgroundColor: palette.accentPale, borderWidth: 1, borderColor: palette.accent },
  rateValue: { fontFamily: Typography.displayFamily, color: palette.accent, fontSize: Typography.h2, fontWeight: '700' },
  rateLabel: { fontFamily: Typography.family, color: palette.inkSoft, fontSize: 10, marginTop: 2 },
  distribution: { height: 18, flexDirection: 'row', overflow: 'hidden', borderRadius: Radius.pill, backgroundColor: palette.surfaceMuted },
  segment: { height: '100%', minWidth: 0 },
  legend: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  legendItem: { minWidth: 118, flexGrow: 1, flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendDot: { width: 8, height: 8, borderRadius: 1 },
  legendLabel: { fontFamily: Typography.family, color: palette.ink, fontSize: Typography.caption, fontWeight: '800' },
  legendValue: { marginLeft: 'auto', fontFamily: 'monospace', color: palette.inkSoft, fontSize: 11 },
  periodSection: { gap: Spacing.sm, paddingTop: Spacing.xs, borderTopWidth: 1, borderTopColor: palette.line },
  sectionTitle: { fontFamily: Typography.displayFamily, color: palette.ink, fontSize: Typography.body, fontWeight: '700' },
  periodGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.xs },
  period: { minWidth: 154, flexBasis: 154, flexGrow: 1, gap: 6, padding: Spacing.sm, backgroundColor: palette.canvasRaised, borderWidth: 1, borderColor: palette.line, borderRadius: Radius.md },
  periodHeading: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', gap: Spacing.xs },
  periodLabel: { fontFamily: Typography.family, color: palette.ink, fontSize: Typography.small, fontWeight: '800' },
  periodRate: { fontFamily: Typography.displayFamily, color: palette.primary, fontSize: Typography.body, fontWeight: '700' },
  periodTrack: { height: 6, overflow: 'hidden', borderRadius: Radius.pill, backgroundColor: palette.surfaceMuted },
  periodFill: { height: '100%', borderRadius: Radius.pill, backgroundColor: palette.accent },
  periodMeta: { fontFamily: Typography.family, color: palette.inkSoft, fontSize: 10, lineHeight: 15 },
  insight: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.sm, padding: Spacing.md, backgroundColor: palette.primaryPale, borderWidth: 1, borderColor: palette.primaryDark, borderRadius: Radius.md },
  insightCopy: { flex: 1, gap: 3 },
  insightLabel: { fontFamily: Typography.family, color: palette.accent, fontSize: Typography.caption, fontWeight: '900' },
  insightText: { fontFamily: Typography.family, color: palette.ink, fontSize: Typography.small, lineHeight: 21 },
});
