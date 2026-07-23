import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useState } from 'react';
import { ActivityIndicator, FlatList, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BrandMark } from '@/components/brand-mark';
import { ImprovementTrend } from '@/components/improvement-trend';
import { SessionHistoryCard } from '@/components/session-history-card';
import { Surface } from '@/components/ui/surface';
import { useAppContext } from '@/context/app-context';
import { Radius, Spacing, Typography, type ThemePalette } from '@/constants/design';
import { useAppTheme, useThemedStyles } from '@/hooks/use-app-theme';
import { getSessions } from '@/lib/api';
import { buildPostureTrend, TREND_SAMPLE_SIZE } from '@/lib/trends';
import type { SessionSummary } from '@/types/posture';

export default function HistoryScreen() {
  const { palette } = useAppTheme();
  const styles = useThemedStyles(createStyles);
  const { account, ready } = useAppContext();
  const [items, setItems] = useState<SessionSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [offline, setOffline] = useState(false);

  const load = useCallback(
    async (refresh = false) => {
      if (!ready) return;
      if (refresh) setRefreshing(true);
      else setLoading(true);
      try {
        setItems(account ? await getSessions() : []);
        setOffline(false);
      } catch {
        setOffline(true);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [account, ready],
  );

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  const completed = items.filter((item) => item.ended_at);
  const average = completed.length
    ? Math.round(completed.reduce((sum, item) => sum + item.good_posture_rate, 0) / completed.length)
    : 0;
  const trend = buildPostureTrend(items);

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <FlatList
        data={completed}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <SessionHistoryCard session={item} />}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => void load(true)}
            tintColor={palette.accent}
            colors={[palette.primary]}
          />
        }
        contentContainerStyle={styles.content}
        ListHeaderComponent={
          <View style={styles.headerArea}>
            <View style={styles.header}>
              <View style={styles.brandRow}>
                <BrandMark />
                <View>
                  <Text style={styles.eyebrow}>MY PROGRESS</Text>
                  <Text style={styles.title}>觀察趨勢</Text>
                </View>
              </View>
              {offline ? (
                <View style={styles.offlinePill}>
                  <Text style={styles.offlineText}>離線</Text>
                </View>
              ) : null}
            </View>
            <Surface tone="ai" style={styles.summary}>
              <View style={styles.summaryCopy}>
                <Text style={styles.summaryEyebrow}>全部已完成工作階段</Text>
                <Text style={styles.summaryTitle}>{completed.length ? `${average}%` : '尚無資料'}</Text>
                <Text style={styles.summaryText}>平均良好坐姿率會排除骨架節點無效的時間。</Text>
              </View>
              <View style={styles.summaryIcon}>
                <MaterialIcons name="insights" size={34} color={palette.primary} />
              </View>
            </Surface>
            <Surface style={styles.trendCard}>
              <View style={styles.trendHeading}>
                <View style={styles.trendTitleCopy}>
                  <Text style={styles.summaryEyebrow}>六次改善證據</Text>
                  <Text style={styles.listTitle}>良好坐姿率趨勢</Text>
                </View>
                <View style={styles.qualifiedPill}>
                  <Text style={styles.qualifiedValue}>{trend.qualifiedCount}/{TREND_SAMPLE_SIZE}</Text>
                  <Text style={styles.qualifiedLabel}>合格資料</Text>
                </View>
              </View>
              <ImprovementTrend sessions={trend.chartSessions} />
              <View style={styles.comparisonRow}>
                <ComparisonMetric
                  label="前 3 次平均"
                  value={trend.previousAverage === null ? '等待資料' : `${trend.previousAverage.toFixed(1)}%`}
                />
                <ComparisonMetric
                  label="最近 3 次平均"
                  value={trend.recentAverage === null ? '等待資料' : `${trend.recentAverage.toFixed(1)}%`}
                />
                <ComparisonMetric
                  label="改善幅度"
                  value={trend.improvement === null ? '等待 6 次' : `${trend.improvement >= 0 ? '+' : ''}${trend.improvement.toFixed(1)} pt`}
                  accent
                />
              </View>
              <Text style={styles.ruleText}>
                只有至少 10 分鐘的工作階段會納入階段評估，避免短暫測試影響結果。
              </Text>
            </Surface>
            <Text style={styles.listTitle}>工作階段紀錄</Text>
          </View>
        }
        ListEmptyComponent={
          loading ? (
            <ActivityIndicator size="large" color={palette.primary} style={styles.loader} />
          ) : (
            <Surface style={styles.empty}>
              <View style={styles.emptyIcon}>
                <MaterialIcons name="timeline" size={34} color={palette.primary} />
              </View>
              <Text style={styles.emptyTitle}>從第一次校準開始</Text>
              <Text style={styles.emptyText}>
                完成一個偵測工作階段後，良好坐姿率、提醒次數與 AI 建議會出現在這裡。
              </Text>
            </Surface>
          )
        }
      />
    </SafeAreaView>
  );
}

function ComparisonMetric({ label, value, accent = false }: { label: string; value: string; accent?: boolean }) {
  const styles = useThemedStyles(createStyles);
  return (
    <View style={styles.comparisonMetric}>
      <Text style={styles.comparisonLabel}>{label}</Text>
      <Text style={[styles.comparisonValue, accent && styles.comparisonAccent]}>{value}</Text>
    </View>
  );
}

const createStyles = (palette: ThemePalette) => StyleSheet.create({
  safe: { flex: 1, backgroundColor: palette.canvas },
  content: { width: '100%', maxWidth: 860, alignSelf: 'center', padding: Spacing.md, paddingBottom: 120 },
  separator: { height: Spacing.md },
  headerArea: { gap: Spacing.lg, marginBottom: Spacing.md },
  header: { minHeight: 62, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  brandRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  eyebrow: { fontFamily: Typography.family, color: palette.primary, fontSize: Typography.caption, fontWeight: '900', letterSpacing: 1 },
  title: { fontFamily: Typography.displayFamily, color: palette.ink, fontSize: Typography.h2, lineHeight: 29, fontWeight: '700' },
  offlinePill: { borderRadius: Radius.pill, paddingHorizontal: Spacing.sm, paddingVertical: Spacing.xs, backgroundColor: palette.surfaceMuted },
  offlineText: { fontFamily: Typography.family, color: palette.inkSoft, fontSize: Typography.caption, fontWeight: '800' },
  summary: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  summaryCopy: { flex: 1 },
  summaryEyebrow: { fontFamily: Typography.family, color: palette.primary, fontSize: Typography.caption, fontWeight: '900' },
  summaryTitle: { fontFamily: Typography.displayFamily, color: palette.ink, fontSize: 36, fontWeight: '700', marginTop: 3 },
  summaryText: { fontFamily: Typography.family, color: palette.inkSoft, fontSize: Typography.small, lineHeight: 21, marginTop: 5 },
  summaryIcon: { width: 64, height: 64, borderRadius: Radius.sm, backgroundColor: palette.surface, borderWidth: 1, borderColor: palette.primaryDark, alignItems: 'center', justifyContent: 'center' },
  trendCard: { gap: Spacing.md },
  trendHeading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: Spacing.md },
  trendTitleCopy: { flex: 1, gap: 4 },
  qualifiedPill: { borderRadius: Radius.md, backgroundColor: palette.accentPale, paddingHorizontal: Spacing.sm, paddingVertical: Spacing.xs, alignItems: 'flex-end' },
  qualifiedValue: { fontFamily: Typography.family, color: palette.accent, fontSize: Typography.body, fontWeight: '900' },
  qualifiedLabel: { fontFamily: Typography.family, color: palette.inkSoft, fontSize: 10, marginTop: 1 },
  comparisonRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.xs },
  comparisonMetric: { flexGrow: 1, minWidth: 118, borderRadius: Radius.md, padding: Spacing.sm, backgroundColor: palette.surfaceMuted },
  comparisonLabel: { fontFamily: Typography.family, color: palette.inkSoft, fontSize: 11, fontWeight: '700' },
  comparisonValue: { fontFamily: Typography.family, color: palette.ink, fontSize: Typography.small, fontWeight: '900', marginTop: 4 },
  comparisonAccent: { color: palette.accent },
  ruleText: { fontFamily: Typography.family, color: palette.inkSoft, fontSize: Typography.caption, lineHeight: 19 },
  listTitle: { fontFamily: Typography.displayFamily, color: palette.ink, fontSize: Typography.h3, fontWeight: '700' },
  loader: { marginTop: Spacing.xxl },
  empty: { alignItems: 'center', paddingVertical: Spacing.xxl, gap: Spacing.sm },
  emptyIcon: { width: 68, height: 68, borderRadius: Radius.sm, backgroundColor: palette.primaryPale, borderWidth: 1, borderColor: palette.primaryDark, alignItems: 'center', justifyContent: 'center' },
  emptyTitle: { fontFamily: Typography.displayFamily, color: palette.ink, fontSize: Typography.h3, fontWeight: '700' },
  emptyText: { fontFamily: Typography.family, color: palette.inkSoft, fontSize: Typography.small, lineHeight: 22, textAlign: 'center', maxWidth: 440 },
});
