import { MaterialIcons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { router } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';

import { PageShell } from '@/components/page-shell';
import { PostureIllustration } from '@/components/posture-illustration';
import { ScoreGauge } from '@/components/score-gauge';
import { StatusPill } from '@/components/status-pill';
import { AppButton } from '@/components/ui/app-button';
import { Surface } from '@/components/ui/surface';
import { useAppContext } from '@/context/app-context';
import { Palette, Radius, Spacing, Typography } from '@/constants/design';
import { getHealth, getSessions } from '@/lib/api';
import { STAGE_LABELS, VIEW_LABELS } from '@/lib/format';
import type { HealthResponse, SessionSummary, ViewMode } from '@/types/posture';

export default function HomeScreen() {
  const { width } = useWindowDimensions();
  const isWide = width >= 800;
  const { profileId, interventionStage, ready } = useAppContext();
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [sessions, setSessions] = useState<SessionSummary[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    if (!ready) return;
    setRefreshing(true);
    const [healthResult, sessionResult] = await Promise.allSettled([
      getHealth(),
      getSessions(profileId),
    ]);
    setHealth(healthResult.status === 'fulfilled' ? healthResult.value : null);
    setSessions(sessionResult.status === 'fulfilled' ? sessionResult.value : []);
    setRefreshing(false);
  }, [profileId, ready]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  const completed = sessions.filter((item) => item.ended_at);
  const averageRate = completed.length
    ? completed.reduce((total, item) => total + item.good_posture_rate, 0) / completed.length
    : 0;
  const today = new Date().toDateString();
  const todaySessions = completed.filter((item) => new Date(item.started_at).toDateString() === today);
  const todayMinutes = Math.round(
    todaySessions.reduce((total, item) => total + item.valid_seconds, 0) / 60,
  );
  const latest = completed[0];

  function start(mode: ViewMode, demo = false) {
    router.push({ pathname: '/session', params: { mode, demo: demo ? '1' : '0' } });
  }

  return (
    <PageShell
      eyebrow="POSTURE GUARDIAN"
      title="姿勢守衛隊"
      refreshing={refreshing}
      onRefresh={load}
      right={
        <StatusPill
          label={health?.status === 'ok' ? 'AI 偵測就緒' : '尚未連線'}
          tone={health?.status === 'ok' ? 'success' : 'neutral'}
        />
      }>
      <Surface style={[styles.hero, isWide && styles.heroWide]}>
        <View style={styles.heroCopy}>
          <StatusPill label={STAGE_LABELS[interventionStage]} tone="info" />
          <Text style={[styles.display, !isWide && styles.displayNarrow]}>坐得自在，{`\n`}也看得見改變。</Text>
          <Text style={styles.lead}>
            用相機骨架與你的 10 秒基線辨識持續偏移；影像只做即時分析，不會存進資料庫。
          </Text>
          <View style={styles.heroActions}>
            <AppButton
              label="開始側面偵測"
              icon="center-focus-strong"
              onPress={() => start('side')}
            />
            <AppButton
              label="試看展示模式"
              variant="secondary"
              icon="play-arrow"
              onPress={() => start('side', true)}
            />
          </View>
        </View>
        <View style={styles.heroVisual}>
          <PostureIllustration />
          <View style={styles.gaugeFloat}>
            <ScoreGauge value={latest?.average_score ?? 86} size={108} />
          </View>
        </View>
      </Surface>

      <View style={styles.sectionHeading}>
        <View>
          <Text style={styles.eyebrow}>選擇觀察視角</Text>
          <Text style={styles.sectionTitle}>今天想觀察哪一種偏移？</Text>
        </View>
        <Text style={styles.sectionNote}>每次移動相機都要重新校準</Text>
      </View>

      <View style={[styles.modeGrid, isWide && styles.modeGridWide]}>
        <ModeCard
          mode="side"
          title="側面視角"
          subtitle="建議優先使用"
          description="觀察頭頸與軀幹前傾角度，需看到同側耳、肩、髖。"
          icon="airline-seat-recline-extra"
          onPress={() => start('side')}
        />
        <ModeCard
          mode="front"
          title="正面視角"
          subtitle="補充觀察"
          description="觀察頭部側傾、肩線高低與軀幹側傾，不能判定前傾。"
          icon="accessibility-new"
          onPress={() => start('front')}
        />
      </View>

      <View style={[styles.metricsGrid, isWide && styles.metricsGridWide]}>
        <MetricCard icon="schedule" label="今日有效觀察" value={`${todayMinutes}`} unit="分鐘" />
        <MetricCard
          icon="verified"
          label="平均良好坐姿率"
          value={completed.length ? `${Math.round(averageRate)}` : '—'}
          unit={completed.length ? '%' : ''}
        />
        <MetricCard icon="event-note" label="完成工作階段" value={`${completed.length}`} unit="次" />
      </View>

      <Surface tone="dark" style={[styles.coach, isWide && styles.coachWide]}>
        <View style={styles.coachIcon}>
          <MaterialIcons name="auto-awesome" size={26} color={Palette.accent} />
        </View>
        <View style={styles.coachCopy}>
          <Text style={styles.coachEyebrow}>
            {latest?.insight_provider === 'foundry' ? 'MICROSOFT FOUNDRY 教練' : '規則式姿勢教練'}
          </Text>
          <Text style={styles.coachTitle}>下一個小調整</Text>
          <Text style={styles.coachText}>
            {latest?.insight_text ||
              '完成第一個工作階段後，這裡會依良好坐姿率、提醒事件與主要偏移提供一個可執行建議。'}
          </Text>
        </View>
        <MaterialIcons name="arrow-forward" size={26} color={Palette.white} />
      </Surface>

      <View style={styles.privacyLine}>
        <MaterialIcons name="lock-outline" size={18} color={Palette.primary} />
        <Text style={styles.privacyText}>隱私優先：只儲存角度、時間與摘要，不儲存相片或即時畫面。</Text>
      </View>
    </PageShell>
  );
}

function ModeCard({
  mode,
  title,
  subtitle,
  description,
  icon,
  onPress,
}: {
  mode: ViewMode;
  title: string;
  subtitle: string;
  description: string;
  icon: keyof typeof MaterialIcons.glyphMap;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`開始${VIEW_LABELS[mode]}偵測`}
      accessibilityHint={description}
      onPress={onPress}
      style={({ pressed }) => [styles.modeCard, pressed && styles.pressed]}>
      <View style={styles.modeIcon}>
        <MaterialIcons name={icon} size={30} color={Palette.primary} />
      </View>
      <View style={styles.modeCopy}>
        <Text style={styles.modeSubtitle}>{subtitle}</Text>
        <Text style={styles.modeTitle}>{title}</Text>
        <Text style={styles.modeDescription}>{description}</Text>
      </View>
      <View style={styles.arrowButton}>
        <MaterialIcons name="arrow-forward" size={20} color={Palette.white} />
      </View>
    </Pressable>
  );
}

function MetricCard({
  icon,
  label,
  value,
  unit,
}: {
  icon: keyof typeof MaterialIcons.glyphMap;
  label: string;
  value: string;
  unit: string;
}) {
  return (
    <Surface style={styles.metricCard}>
      <MaterialIcons name={icon} size={22} color={Palette.primary} />
      <Text style={styles.metricLabel}>{label}</Text>
      <View style={styles.metricValueRow}>
        <Text style={styles.metricValue}>{value}</Text>
        <Text style={styles.metricUnit}>{unit}</Text>
      </View>
    </Surface>
  );
}

const styles = StyleSheet.create({
  hero: { backgroundColor: Palette.surface, padding: Spacing.lg, gap: Spacing.xl, overflow: 'hidden' },
  heroWide: { flexDirection: 'row', minHeight: 430, padding: Spacing.xxl, alignItems: 'center' },
  heroCopy: { flex: 1.15, alignItems: 'flex-start', gap: Spacing.lg },
  display: {
    fontFamily: Typography.family,
    color: Palette.ink,
    fontSize: Typography.display,
    lineHeight: 50,
    fontWeight: '900',
    letterSpacing: -1.3,
  },
  displayNarrow: { fontSize: 34, lineHeight: 43 },
  lead: { fontFamily: Typography.family, color: Palette.inkSoft, fontSize: Typography.body, lineHeight: 27, maxWidth: 590 },
  heroActions: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  heroVisual: { flex: 0.85, alignItems: 'center', justifyContent: 'center', minHeight: 250 },
  gaugeFloat: { position: 'absolute', right: 2, bottom: -4, padding: 5, borderRadius: Radius.pill, backgroundColor: Palette.surface },
  sectionHeading: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', gap: Spacing.md },
  eyebrow: { fontFamily: Typography.family, color: Palette.primary, fontSize: Typography.caption, fontWeight: '900', letterSpacing: 1 },
  sectionTitle: { fontFamily: Typography.family, color: Palette.ink, fontSize: Typography.h2, fontWeight: '900', marginTop: 4 },
  sectionNote: { fontFamily: Typography.family, color: Palette.inkSoft, fontSize: Typography.caption, textAlign: 'right', flexShrink: 1 },
  modeGrid: { gap: Spacing.md },
  modeGridWide: { flexDirection: 'row' },
  modeCard: {
    flex: 1,
    minHeight: 178,
    backgroundColor: Palette.surface,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Palette.line,
    padding: Spacing.lg,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.md,
  },
  pressed: { opacity: 0.75, transform: [{ scale: 0.99 }] },
  modeIcon: { width: 54, height: 54, borderRadius: Radius.md, alignItems: 'center', justifyContent: 'center', backgroundColor: Palette.primaryPale },
  modeCopy: { flex: 1, gap: 4 },
  modeSubtitle: { fontFamily: Typography.family, color: Palette.primary, fontSize: Typography.caption, fontWeight: '800' },
  modeTitle: { fontFamily: Typography.family, color: Palette.ink, fontSize: Typography.h3, fontWeight: '900' },
  modeDescription: { fontFamily: Typography.family, color: Palette.inkSoft, fontSize: Typography.small, lineHeight: 21, marginTop: 5 },
  arrowButton: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: Palette.primary, alignSelf: 'flex-end' },
  metricsGrid: { gap: Spacing.md },
  metricsGridWide: { flexDirection: 'row' },
  metricCard: { flex: 1, gap: Spacing.sm, minHeight: 150 },
  metricLabel: { fontFamily: Typography.family, color: Palette.inkSoft, fontSize: Typography.small, fontWeight: '700' },
  metricValueRow: { flexDirection: 'row', alignItems: 'baseline', gap: 5 },
  metricValue: { fontFamily: Typography.family, color: Palette.ink, fontSize: 34, fontWeight: '900' },
  metricUnit: { fontFamily: Typography.family, color: Palette.inkSoft, fontSize: Typography.small, fontWeight: '700' },
  coach: { gap: Spacing.md, alignItems: 'flex-start' },
  coachWide: { flexDirection: 'row', alignItems: 'center', padding: Spacing.xl },
  coachIcon: { width: 54, height: 54, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: '#264342' },
  coachCopy: { flex: 1, gap: 5 },
  coachEyebrow: { fontFamily: Typography.family, color: Palette.accent, fontSize: Typography.caption, fontWeight: '900', letterSpacing: 0.8 },
  coachTitle: { fontFamily: Typography.family, color: Palette.white, fontSize: Typography.h3, fontWeight: '900' },
  coachText: { fontFamily: Typography.family, color: '#D8E6E2', fontSize: Typography.small, lineHeight: 22 },
  privacyLine: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.xs, paddingHorizontal: Spacing.md },
  privacyText: { fontFamily: Typography.family, color: Palette.inkSoft, fontSize: Typography.caption, lineHeight: 18, flexShrink: 1 },
});
