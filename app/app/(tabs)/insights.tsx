import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useFocusEffect } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useCallback, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { AiOrb } from '@/components/ai-orb';
import { ImprovementTrend } from '@/components/improvement-trend';
import { PageShell } from '@/components/page-shell';
import { StatusPill } from '@/components/status-pill';
import { AppButton } from '@/components/ui/app-button';
import { Surface } from '@/components/ui/surface';
import { useAppContext } from '@/context/app-context';
import { Radius, Spacing, Typography, type ThemePalette } from '@/constants/design';
import { useAppTheme, useThemedStyles } from '@/hooks/use-app-theme';
import { getHealth, getSessions } from '@/lib/api';
import { useWideLayout } from '@/hooks/use-wide-layout';
import { buildPostureTrend, nextCoachTask, TREND_SAMPLE_SIZE } from '@/lib/trends';
import type { HealthResponse, SessionSummary } from '@/types/posture';

const PIPELINE = [
  {
    icon: 'camera-alt' as const,
    title: '即時相機畫面',
    detail: '只在裝置與 API 間短暫分析，不寫入資料庫。',
  },
  {
    icon: 'accessibility-new' as const,
    title: 'MediaPipe 33 個節點',
    detail: '先確認耳、肩、髖等節點品質，再計算角度。',
  },
  {
    icon: 'rule' as const,
    title: '個人基線 × 時間窗',
    detail: '規則引擎判斷偏移持續時間，AI 不負責判定姿勢好壞。',
  },
  {
    icon: 'storage' as const,
    title: '去識別趨勢摘要',
    detail: 'PostgreSQL 相容層只保存角度、時間與工作階段摘要。',
  },
  {
    icon: 'auto-awesome' as const,
    title: '量界智算個人化教練',
    detail: '只讀取去識別摘要產生可執行建議；失敗時透明切回本地 fallback。',
  },
];

export default function InsightsScreen() {
  const { gradients, palette } = useAppTheme();
  const styles = useThemedStyles(createStyles);
  const isWide = useWideLayout(840);
  const { profileId, ready } = useAppContext();
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

  const trend = buildPostureTrend(sessions);
  const task = nextCoachTask(trend);
  const latest = trend.completed[0];
  const actualProvider = latest?.insight_provider;
  const providerSucceeded = actualProvider === 'liangjie' || actualProvider === 'foundry';
  const providerLabel = actualProvider === 'liangjie'
    ? '最近一次量界智算成功'
    : actualProvider === 'foundry'
      ? '最近一次使用舊版雲端 AI'
    : actualProvider
      ? '最近一次使用規則式 fallback'
      : health?.insight_provider === 'liangjie' && health.insight_configured
        ? '量界智算已設定，等待首次呼叫'
        : '目前為規則式 fallback';
  const delta = trend.improvement;

  return (
    <PageShell
      eyebrow="AI COACH & EVIDENCE"
      title="AI 洞察"
      refreshing={refreshing}
      onRefresh={load}
      right={<StatusPill label={providerLabel} tone={providerSucceeded ? 'success' : 'info'} />}>
      <LinearGradient
        colors={gradients.ai}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.hero, isWide && styles.heroWide]}>
        <View style={styles.heroCopy}>
          <View style={styles.heroBadge}>
            <MaterialIcons name="auto-awesome" size={16} color={palette.heroInk} />
            <Text style={styles.heroBadgeText}>EXPLAINABLE AI</Text>
          </View>
          <Text style={styles.heroTitle}>每個提醒，都能說明依據。</Text>
          <Text style={styles.heroLead}>
            骨架與規則負責即時判斷；AI 讀取同一匿名使用者的趨勢摘要，只產生下一個可執行調整。
          </Text>
          <View style={styles.heroFacts}>
            <Fact value="33" label="姿態節點" />
            <Fact value="10s" label="個人校準" />
            <Fact value="8s" label="持續偏移" />
          </View>
        </View>
        <View style={styles.aiPanel}>
          <AiOrb size={168} />
        </View>
      </LinearGradient>

      <View style={[styles.grid, isWide && styles.gridWide]}>
        <Surface tone="ai" style={styles.coachCard}>
          <View style={styles.cardHeading}>
            <View>
              <Text style={styles.kicker}>下一個小任務</Text>
              <Text style={styles.cardTitle}>{task.title}</Text>
            </View>
            <View style={styles.iconFrame}>
              <MaterialIcons name="track-changes" size={26} color={palette.accent} />
            </View>
          </View>
          <Text style={styles.body}>{latest?.insight_text || task.detail}</Text>
          <View style={styles.providerLine}>
            <MaterialIcons name="verified" size={17} color={palette.primaryDark} />
            <Text style={styles.providerText}>{providerLabel}</Text>
          </View>
          <View style={styles.auditGrid}>
            <AuditFact label="模型 ID" value={health?.insight_model || '尚未設定'} />
            <AuditFact label="API 模式" value={health?.insight_api_mode || '本地 fallback'} />
            <AuditFact label="Prompt 契約" value={health?.insight_prompt_version || 'posture-coach-v1'} />
            <AuditFact label="輸入邊界" value="去識別摘要" />
          </View>
          <AppButton
            label="開始 10 分鐘觀察"
            icon="play-arrow"
            onPress={() => router.push({ pathname: '/session', params: { mode: 'side', demo: '0' } })}
          />
        </Surface>

        <Surface style={styles.readinessCard}>
          <Text style={styles.kicker}>AI 資料充分度</Text>
          <View style={styles.readinessValueRow}>
            <Text style={styles.readinessValue}>{trend.qualifiedCount}</Text>
            <Text style={styles.readinessTotal}>/ {TREND_SAMPLE_SIZE} 次</Text>
          </View>
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${trend.readinessPercent}%` }]} />
          </View>
          <Text style={styles.body}>
            每次需至少 10 分鐘才納入提醒階段比較；短資料仍保留，但不會硬湊出改善結論。
          </Text>
        </Surface>
      </View>

      <Surface style={styles.trendCard}>
        <View style={[styles.cardHeading, styles.wrapHeading]}>
          <View style={styles.headingGrow}>
            <Text style={styles.kicker}>最近六次改善證據</Text>
            <Text style={styles.cardTitle}>良好坐姿率趨勢</Text>
          </View>
          <View style={[styles.deltaPill, delta !== null && delta < 0 && styles.deltaNegative]}>
            <Text style={styles.deltaValue}>
              {delta === null ? '等待 6 次' : `${delta >= 0 ? '+' : ''}${delta.toFixed(1)} pt`}
            </Text>
            <Text style={styles.deltaLabel}>最近 3 次 vs 前 3 次</Text>
          </View>
        </View>
        <ImprovementTrend sessions={trend.chartSessions} />
        <Text style={styles.chartCaption}>
          {trend.hasComparison
            ? `前 3 次平均 ${trend.previousAverage?.toFixed(1)}%，最近 3 次平均 ${trend.recentAverage?.toFixed(1)}%。`
            : `目前有 ${trend.qualifiedCount} 次合格資料，累積到 6 次後才比較前後趨勢。`}
        </Text>
      </Surface>

      <View style={styles.sectionHeading}>
        <Text style={styles.kicker}>VPS DEPLOYMENT-READY PIPELINE</Text>
        <Text accessibilityRole="header" style={styles.sectionTitle}>AI 證據鏈</Text>
        <Text style={styles.sectionLead}>評審可以從輸入到輸出逐步核對，不把 AI 當成黑盒子。</Text>
      </View>
      <Surface style={styles.pipeline}>
        {PIPELINE.map((step, index) => (
          <View key={step.title} style={styles.pipelineRow}>
            <View style={styles.pipelineRail}>
              <View style={styles.pipelineIcon}>
                <MaterialIcons name={step.icon} size={22} color={palette.accent} />
              </View>
              {index < PIPELINE.length - 1 ? <View style={styles.pipelineLine} /> : null}
            </View>
            <View style={styles.pipelineCopy}>
              <Text style={styles.pipelineIndex}>0{index + 1}</Text>
              <Text style={styles.pipelineTitle}>{step.title}</Text>
              <Text style={styles.pipelineText}>{step.detail}</Text>
            </View>
          </View>
        ))}
      </Surface>

      <View style={styles.safetyLine}>
        <MaterialIcons name="shield" size={19} color={palette.accent} />
        <Text style={styles.safetyText}>這是姿勢覺察工具，不提供醫療診斷；原始影像固定不保存。</Text>
      </View>
    </PageShell>
  );
}

function Fact({ value, label }: { value: string; label: string }) {
  const styles = useThemedStyles(createStyles);
  return (
    <View style={styles.fact}>
      <Text style={styles.factValue}>{value}</Text>
      <Text style={styles.factLabel}>{label}</Text>
    </View>
  );
}

function AuditFact({ label, value }: { label: string; value: string }) {
  const styles = useThemedStyles(createStyles);
  return (
    <View style={styles.auditFact}>
      <Text style={styles.auditLabel}>{label}</Text>
      <Text style={styles.auditValue}>{value}</Text>
    </View>
  );
}

const createStyles = (palette: ThemePalette) => StyleSheet.create({
  hero: {
    minHeight: 390,
    borderRadius: Radius.lg,
    padding: Spacing.xl,
    gap: Spacing.lg,
    alignItems: 'center',
    justifyContent: 'space-between',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: palette.heroInk,
  },
  heroWide: { minHeight: 360, flexDirection: 'row', padding: Spacing.xxl },
  heroCopy: { flex: 1, alignItems: 'flex-start', gap: Spacing.md, maxWidth: 680 },
  heroBadge: { flexDirection: 'row', alignItems: 'center', gap: 7, backgroundColor: 'rgba(255,249,239,0.56)', borderRadius: Radius.pill, borderWidth: 1, borderColor: palette.heroInk, paddingHorizontal: Spacing.sm, paddingVertical: Spacing.xs },
  heroBadgeText: { color: palette.heroInk, fontFamily: Typography.family, fontSize: Typography.caption, fontWeight: '800', letterSpacing: 1.2 },
  heroTitle: { color: palette.heroInk, fontFamily: Typography.displayFamily, fontSize: 36, lineHeight: 45, fontWeight: '700', letterSpacing: -0.6 },
  heroLead: { color: palette.heroInkSoft, fontFamily: Typography.family, fontSize: Typography.body, lineHeight: 26, maxWidth: 620 },
  heroFacts: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  fact: { minWidth: 102, borderRadius: Radius.md, padding: Spacing.sm, backgroundColor: 'rgba(255,249,239,0.48)', borderWidth: 1, borderColor: palette.heroInk },
  factValue: { color: palette.heroInk, fontFamily: Typography.displayFamily, fontSize: Typography.h2, fontWeight: '700' },
  factLabel: { color: palette.heroInkSoft, fontFamily: Typography.family, fontSize: Typography.caption, marginTop: 2 },
  aiPanel: { padding: Spacing.sm, backgroundColor: 'rgba(255,249,239,0.34)', borderWidth: 1, borderColor: palette.heroInk },
  grid: { gap: Spacing.md },
  gridWide: { flexDirection: 'row' },
  coachCard: { flex: 1.3, gap: Spacing.md },
  readinessCard: { flex: 0.7, gap: Spacing.md },
  cardHeading: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: Spacing.md },
  wrapHeading: { flexWrap: 'wrap' },
  headingGrow: { flex: 1, minWidth: 210 },
  kicker: { color: palette.accent, fontFamily: Typography.family, fontSize: Typography.caption, fontWeight: '900', letterSpacing: 1 },
  cardTitle: { color: palette.ink, fontFamily: Typography.displayFamily, fontSize: Typography.h3, lineHeight: 25, fontWeight: '700', marginTop: 5 },
  iconFrame: { width: 48, height: 48, borderRadius: Radius.sm, backgroundColor: palette.accentPale, borderWidth: 1, borderColor: palette.accent, alignItems: 'center', justifyContent: 'center' },
  body: { color: palette.inkSoft, fontFamily: Typography.family, fontSize: Typography.small, lineHeight: 22 },
  providerLine: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs },
  providerText: { color: palette.primaryDark, fontFamily: Typography.family, fontSize: Typography.caption, fontWeight: '800', flexShrink: 1 },
  auditGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.xs },
  auditFact: { minWidth: 136, flexGrow: 1, gap: 3, borderWidth: 1, borderColor: palette.line, backgroundColor: palette.canvasRaised, padding: Spacing.sm },
  auditLabel: { color: palette.inkSoft, fontFamily: Typography.family, fontSize: 10, fontWeight: '700' },
  auditValue: { color: palette.ink, fontFamily: 'monospace', fontSize: Typography.caption, fontWeight: '800' },
  readinessValueRow: { flexDirection: 'row', alignItems: 'baseline', gap: 5 },
  readinessValue: { color: palette.ink, fontFamily: Typography.displayFamily, fontSize: 46, fontWeight: '700' },
  readinessTotal: { color: palette.inkSoft, fontFamily: Typography.family, fontSize: Typography.body, fontWeight: '800' },
  progressTrack: { height: 10, borderRadius: Radius.pill, backgroundColor: palette.surfaceMuted, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: Radius.pill, backgroundColor: palette.accent },
  trendCard: { gap: Spacing.md },
  deltaPill: { borderRadius: Radius.md, backgroundColor: palette.accentPale, paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, alignItems: 'flex-end' },
  deltaNegative: { backgroundColor: palette.warningPale },
  deltaValue: { color: palette.ink, fontFamily: Typography.displayFamily, fontSize: Typography.h3, fontWeight: '700' },
  deltaLabel: { color: palette.inkSoft, fontFamily: Typography.family, fontSize: 10, marginTop: 2 },
  chartCaption: { color: palette.inkSoft, fontFamily: Typography.family, fontSize: Typography.caption, lineHeight: 19 },
  sectionHeading: { gap: 4 },
  sectionTitle: { color: palette.ink, fontFamily: Typography.displayFamily, fontSize: Typography.h2, fontWeight: '700' },
  sectionLead: { color: palette.inkSoft, fontFamily: Typography.family, fontSize: Typography.small, lineHeight: 21 },
  pipeline: { gap: 0 },
  pipelineRow: { flexDirection: 'row', gap: Spacing.md, minHeight: 116 },
  pipelineRail: { width: 48, alignItems: 'center' },
  pipelineIcon: { width: 44, height: 44, borderRadius: Radius.sm, alignItems: 'center', justifyContent: 'center', backgroundColor: palette.accentPale, borderWidth: 1, borderColor: palette.accent },
  pipelineLine: { width: 1, flex: 1, backgroundColor: palette.lineBright, marginVertical: 5 },
  pipelineCopy: { flex: 1, paddingBottom: Spacing.lg },
  pipelineIndex: { color: palette.primaryDark, fontFamily: 'monospace', fontSize: 11, fontWeight: '800' },
  pipelineTitle: { color: palette.ink, fontFamily: Typography.displayFamily, fontSize: Typography.body, fontWeight: '700', marginTop: 4 },
  pipelineText: { color: palette.inkSoft, fontFamily: Typography.family, fontSize: Typography.caption, lineHeight: 19, marginTop: 4 },
  safetyLine: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.xs, paddingHorizontal: Spacing.md },
  safetyText: { color: palette.inkSoft, fontFamily: Typography.family, fontSize: Typography.caption, lineHeight: 18, flexShrink: 1 },
});
