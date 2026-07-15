import { MaterialIcons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useState } from 'react';
import { ActivityIndicator, FlatList, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BrandMark } from '@/components/brand-mark';
import { SessionHistoryCard } from '@/components/session-history-card';
import { Surface } from '@/components/ui/surface';
import { useAppContext } from '@/context/app-context';
import { Palette, Radius, Spacing, Typography } from '@/constants/design';
import { getSessions } from '@/lib/api';
import type { SessionSummary } from '@/types/posture';

export default function HistoryScreen() {
  const { profileId, ready } = useAppContext();
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
        setItems(await getSessions(profileId));
        setOffline(false);
      } catch {
        setOffline(true);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [profileId, ready],
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

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <FlatList
        data={completed}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <SessionHistoryCard session={item} />}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void load(true)} />}
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
            <Surface tone="green" style={styles.summary}>
              <View style={styles.summaryCopy}>
                <Text style={styles.summaryEyebrow}>所有已完成階段</Text>
                <Text style={styles.summaryTitle}>{completed.length ? `${average}%` : '尚無資料'}</Text>
                <Text style={styles.summaryText}>平均良好坐姿率會排除骨架節點無效的時間。</Text>
              </View>
              <View style={styles.summaryIcon}>
                <MaterialIcons name="insights" size={34} color={Palette.primary} />
              </View>
            </Surface>
            <Text style={styles.listTitle}>工作階段紀錄</Text>
          </View>
        }
        ListEmptyComponent={
          loading ? (
            <ActivityIndicator size="large" color={Palette.primary} style={styles.loader} />
          ) : (
            <Surface style={styles.empty}>
              <View style={styles.emptyIcon}>
                <MaterialIcons name="timeline" size={34} color={Palette.primary} />
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

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Palette.canvas },
  content: { width: '100%', maxWidth: 860, alignSelf: 'center', padding: Spacing.md, paddingBottom: 120 },
  separator: { height: Spacing.md },
  headerArea: { gap: Spacing.lg, marginBottom: Spacing.md },
  header: { minHeight: 62, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  brandRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  eyebrow: { fontFamily: Typography.family, color: Palette.primary, fontSize: Typography.caption, fontWeight: '900', letterSpacing: 1 },
  title: { fontFamily: Typography.family, color: Palette.ink, fontSize: Typography.h2, fontWeight: '900' },
  offlinePill: { borderRadius: Radius.pill, paddingHorizontal: Spacing.sm, paddingVertical: Spacing.xs, backgroundColor: Palette.surfaceMuted },
  offlineText: { fontFamily: Typography.family, color: Palette.inkSoft, fontSize: Typography.caption, fontWeight: '800' },
  summary: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  summaryCopy: { flex: 1 },
  summaryEyebrow: { fontFamily: Typography.family, color: Palette.primary, fontSize: Typography.caption, fontWeight: '900' },
  summaryTitle: { fontFamily: Typography.family, color: Palette.ink, fontSize: 36, fontWeight: '900', marginTop: 3 },
  summaryText: { fontFamily: Typography.family, color: Palette.inkSoft, fontSize: Typography.small, lineHeight: 21, marginTop: 5 },
  summaryIcon: { width: 64, height: 64, borderRadius: 22, backgroundColor: Palette.surface, alignItems: 'center', justifyContent: 'center' },
  listTitle: { fontFamily: Typography.family, color: Palette.ink, fontSize: Typography.h3, fontWeight: '900' },
  loader: { marginTop: Spacing.xxl },
  empty: { alignItems: 'center', paddingVertical: Spacing.xxl, gap: Spacing.sm },
  emptyIcon: { width: 68, height: 68, borderRadius: 24, backgroundColor: Palette.primaryPale, alignItems: 'center', justifyContent: 'center' },
  emptyTitle: { fontFamily: Typography.family, color: Palette.ink, fontSize: Typography.h3, fontWeight: '900' },
  emptyText: { fontFamily: Typography.family, color: Palette.inkSoft, fontSize: Typography.small, lineHeight: 22, textAlign: 'center', maxWidth: 440 },
});
