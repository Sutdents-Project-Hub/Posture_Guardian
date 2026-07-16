import { MaterialIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { CameraType, CameraView, useCameraPermissions } from 'expo-camera';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
  Alert,
  ActivityIndicator,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  Vibration,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BrandMark } from '@/components/brand-mark';
import { PostureOverlay } from '@/components/posture-overlay';
import { ScoreGauge } from '@/components/score-gauge';
import { StatusPill } from '@/components/status-pill';
import { AppButton } from '@/components/ui/app-button';
import { Surface } from '@/components/ui/surface';
import { useAppContext } from '@/context/app-context';
import { Radius, Spacing, Typography, type ThemePalette } from '@/constants/design';
import { useAppTheme, useThemedStyles } from '@/hooks/use-app-theme';
import {
  addSessionSample,
  analyzePosture,
  completeSession,
  createSession,
  submitSessionFeedback,
} from '@/lib/api';
import { createDemoAnalysis } from '@/lib/demo';
import { formatDuration, STAGE_LABELS, VIEW_LABELS } from '@/lib/format';
import { useWideLayout } from '@/hooks/use-wide-layout';
import type {
  AnalysisResponse,
  InterventionStage,
  ReminderFit,
  SessionCompleteResponse,
  SessionSummary,
  SessionFeeling,
  ViewMode,
} from '@/types/posture';

type Phase = 'setup' | 'calibrating' | 'active' | 'finishing' | 'summary';

const CALIBRATION_SECONDS = 10;
const ATTENTION_SECONDS = 8;
const RECOVERY_SECONDS = 3;
const CAPTURE_INTERVAL_MS = 650;
const COOLDOWNS: Record<InterventionStage, number> = {
  starter: 60,
  advanced: 45,
  intensive: 30,
};

function median(values: number[]): number {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
}

export default function SessionScreen() {
  const { palette } = useAppTheme();
  const styles = useThemedStyles(createStyles);
  const params = useLocalSearchParams<{ mode?: string; demo?: string }>();
  const viewMode: ViewMode = params.mode === 'front' ? 'front' : 'side';
  const demo = params.demo === '1';
  const isWide = useWideLayout(900);
  const {
    profileId,
    interventionStage,
    hapticsEnabled,
    setInterventionStage,
  } = useAppContext();
  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef<CameraView>(null);
  const [facing, setFacing] = useState<CameraType>('front');
  const [cameraReady, setCameraReady] = useState(false);
  const [phase, setPhase] = useState<Phase>('setup');
  const [analysis, setAnalysis] = useState<AnalysisResponse | null>(null);
  const [baseline, setBaseline] = useState<Record<string, number> | null>(null);
  const [progress, setProgress] = useState(0);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [eventActive, setEventActive] = useState(false);
  const [reminderCountdown, setReminderCountdown] = useState<number | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [cloudStorageAvailable, setCloudStorageAvailable] = useState(true);
  const [completion, setCompletion] = useState<SessionCompleteResponse | null>(null);

  const processingRef = useRef(false);
  const transitionRef = useRef(false);
  const calibrationStartedRef = useRef(0);
  const calibrationFramesRef = useRef<AnalysisResponse[]>([]);
  const calibrationTotalRef = useRef(0);
  const activeStartedRef = useRef(0);
  const sessionIdRef = useRef<string | null>(null);
  const attentionSinceRef = useRef<number | null>(null);
  const goodSinceRef = useRef<number | null>(null);
  const invalidSinceRef = useRef<number | null>(null);
  const eventActiveRef = useRef(false);
  const lastReminderRef = useRef(0);
  const lastSampleRef = useRef(0);
  const validSecondsRef = useRef(0);
  const goodSecondsRef = useRef(0);
  const invalidSecondsRef = useRef(0);
  const scoreTotalRef = useRef(0);
  const scoreCountRef = useRef(0);
  const eventCountRef = useRef(0);
  const issueCountsRef = useRef<Record<string, number>>({});
  const sessionStartedIsoRef = useRef(new Date().toISOString());

  function resetRuntime() {
    processingRef.current = false;
    transitionRef.current = false;
    calibrationFramesRef.current = [];
    calibrationTotalRef.current = 0;
    sessionIdRef.current = null;
    attentionSinceRef.current = null;
    goodSinceRef.current = null;
    invalidSinceRef.current = null;
    eventActiveRef.current = false;
    lastReminderRef.current = 0;
    lastSampleRef.current = 0;
    validSecondsRef.current = 0;
    goodSecondsRef.current = 0;
    invalidSecondsRef.current = 0;
    scoreTotalRef.current = 0;
    scoreCountRef.current = 0;
    eventCountRef.current = 0;
    issueCountsRef.current = {};
    sessionStartedIsoRef.current = new Date().toISOString();
    setAnalysis(null);
    setBaseline(null);
    setProgress(0);
    setElapsedSeconds(0);
    setEventActive(false);
    setReminderCountdown(null);
    setMessage(null);
    setCompletion(null);
    setCloudStorageAvailable(true);
  }

  async function startCalibration() {
    if (!demo) {
      const result = permission?.granted ? permission : await requestPermission();
      if (!result.granted) {
        setMessage('需要相機權限才能進行即時姿勢分析；你也可以先使用展示模式。');
        return;
      }
    }
    resetRuntime();
    calibrationStartedRef.current = Date.now();
    setPhase('calibrating');
  }

  useEffect(() => {
    if (phase !== 'calibrating' && phase !== 'active') return;
    if (!demo && !cameraReady) return;
    let mounted = true;

    async function captureResult(now: number): Promise<AnalysisResponse> {
      const phaseElapsed =
        phase === 'calibrating'
          ? (now - calibrationStartedRef.current) / 1000
          : (now - activeStartedRef.current) / 1000;
      if (demo) return createDemoAnalysis(viewMode, phaseElapsed, phase === 'active' ? baseline || undefined : undefined);
      const camera = cameraRef.current;
      if (!camera) throw new Error('相機尚未就緒。');
      const photo = await camera.takePictureAsync({
        quality: 0.35,
        base64: Platform.OS === 'web',
        skipProcessing: false,
        shutterSound: false,
      });
      if (!photo) throw new Error('無法取得相機影格。');
      const uri =
        Platform.OS === 'web' && photo.base64
          ? `data:image/jpeg;base64,${photo.base64}`
          : photo.uri;
      return analyzePosture(uri, viewMode, phase === 'active' ? baseline || undefined : undefined);
    }

    async function triggerReminder() {
      if (!hapticsEnabled || Platform.OS === 'web' || interventionStage === 'starter') return;
      if (interventionStage === 'intensive') {
        Vibration.vibrate([0, 350, 180, 350]);
      } else {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      }
    }

    async function transitionToActive() {
      const validFrames = calibrationFramesRef.current;
      const validRatio = validFrames.length / Math.max(1, calibrationTotalRef.current);
      if (validFrames.length < 5 || validRatio < 0.8) {
        setMessage(
          `有效影格只有 ${Math.round(validRatio * 100)}%，請讓耳朵、肩膀與髖部完整入鏡後重新校準。`,
        );
        setPhase('setup');
        return;
      }
      const metricKeys = Object.keys(validFrames[0].metrics);
      const nextBaseline = Object.fromEntries(
        metricKeys.map((key) => [key, +median(validFrames.map((frame) => frame.metrics[key])).toFixed(2)]),
      );
      setBaseline(nextBaseline);
      try {
        const created = await createSession({
          profile_id: profileId,
          view_mode: viewMode,
          intervention_stage: interventionStage,
          baseline: nextBaseline,
        });
        sessionIdRef.current = created.id;
        sessionStartedIsoRef.current = created.started_at;
      } catch {
        setCloudStorageAvailable(false);
      }
      const now = Date.now();
      activeStartedRef.current = now;
      lastSampleRef.current = now;
      transitionRef.current = false;
      setProgress(1);
      setPhase('active');
    }

    async function tick() {
      if (!mounted || processingRef.current || transitionRef.current) return;
      processingRef.current = true;
      const now = Date.now();
      try {
        const result = await captureResult(now);
        if (!mounted) return;
        setAnalysis(result);
        setMessage(null);

        if (phase === 'calibrating') {
          calibrationTotalRef.current += 1;
          if (result.valid) calibrationFramesRef.current.push(result);
          const seconds = (now - calibrationStartedRef.current) / 1000;
          setElapsedSeconds(seconds);
          setProgress(Math.min(1, seconds / CALIBRATION_SECONDS));
          if (seconds >= CALIBRATION_SECONDS && !transitionRef.current) {
            transitionRef.current = true;
            await transitionToActive();
          }
          return;
        }

        const activeElapsed = (now - activeStartedRef.current) / 1000;
        setElapsedSeconds(activeElapsed);
        const sampleDuration = Math.max(0.2, Math.min(2, (now - lastSampleRef.current) / 1000));
        lastSampleRef.current = now;

        if (!result.valid) {
          invalidSecondsRef.current += sampleDuration;
          invalidSinceRef.current ??= now;
          if (now - invalidSinceRef.current >= 5000) {
            setMessage('已連續 5 秒看不到必要節點，請調整相機或坐回畫面中央。');
          }
        } else {
          invalidSinceRef.current = null;
          validSecondsRef.current += sampleDuration;
          scoreTotalRef.current += result.posture_score;
          scoreCountRef.current += 1;
          const thresholdExceeded = result.status === 'attention';

          if (thresholdExceeded) {
            goodSinceRef.current = null;
            attentionSinceRef.current ??= now;
            const attentionDuration = (now - attentionSinceRef.current) / 1000;
            setReminderCountdown(Math.max(0, Math.ceil(ATTENTION_SECONDS - attentionDuration)));
            for (const reason of result.reasons) {
              issueCountsRef.current[reason] = (issueCountsRef.current[reason] || 0) + 1;
            }
            if (attentionDuration >= ATTENTION_SECONDS && !eventActiveRef.current) {
              eventActiveRef.current = true;
              eventCountRef.current += 1;
              lastReminderRef.current = now;
              setEventActive(true);
              await triggerReminder();
            }
          } else {
            attentionSinceRef.current = null;
            setReminderCountdown(null);
            if (eventActiveRef.current) {
              goodSinceRef.current ??= now;
              if ((now - goodSinceRef.current) / 1000 >= RECOVERY_SECONDS) {
                eventActiveRef.current = false;
                goodSinceRef.current = null;
                setEventActive(false);
              }
            }
          }

          if (!eventActiveRef.current) goodSecondsRef.current += sampleDuration;
          if (
            eventActiveRef.current &&
            now - lastReminderRef.current >= COOLDOWNS[interventionStage] * 1000
          ) {
            lastReminderRef.current = now;
            await triggerReminder();
          }
        }

        const sessionId = sessionIdRef.current;
        if (sessionId && cloudStorageAvailable) {
          try {
            await addSessionSample(sessionId, {
              duration_seconds: sampleDuration,
              is_valid: result.valid,
              threshold_exceeded: result.status === 'attention',
              event_active: eventActiveRef.current,
              posture_score: result.posture_score,
              metrics: result.metrics,
              deviations: result.deviations,
              reasons: result.reasons,
            });
          } catch {
            setCloudStorageAvailable(false);
          }
        }
      } catch (error) {
        if (mounted) setMessage(error instanceof Error ? error.message : '姿勢分析暫時失敗。');
      } finally {
        processingRef.current = false;
      }
    }

    void tick();
    const timer = setInterval(() => void tick(), CAPTURE_INTERVAL_MS);
    return () => {
      mounted = false;
      clearInterval(timer);
    };
  }, [
    baseline,
    cameraReady,
    cloudStorageAvailable,
    demo,
    hapticsEnabled,
    interventionStage,
    phase,
    profileId,
    viewMode,
  ]);

  function localSummary(): SessionCompleteResponse {
    const valid = validSecondsRef.current;
    const primaryIssue = Object.entries(issueCountsRef.current).sort((a, b) => b[1] - a[1])[0]?.[0] || null;
    const goodRate = valid ? (goodSecondsRef.current / valid) * 100 : 0;
    const summary: SessionSummary = {
      id: `local-${Date.now()}`,
      view_mode: viewMode,
      intervention_stage: interventionStage,
      started_at: sessionStartedIsoRef.current,
      ended_at: new Date().toISOString(),
      valid_seconds: valid,
      good_seconds: goodSecondsRef.current,
      invalid_seconds: invalidSecondsRef.current,
      posture_event_count: eventCountRef.current,
      average_score: scoreCountRef.current ? scoreTotalRef.current / scoreCountRef.current : 0,
      good_posture_rate: goodRate,
      primary_issue: primaryIssue,
      insight_text:
        goodRate >= 75
          ? '已能穩定回到個人基線；接下來維持舒服坐姿，並每 25–30 分鐘起身活動。'
          : `主要偏移是「${primaryIssue || '姿勢角度'}」。先休息 5 分鐘並調整螢幕與座椅，再重新校準。`,
      insight_provider: 'fallback',
    };
    return {
      summary,
      suggested_stage: interventionStage,
      stage_reason: '本次為離線摘要；累積 6 次至少 10 分鐘的雲端紀錄後才會評估提醒階段。',
    };
  }

  async function finish() {
    if (phase !== 'active') return;
    setPhase('finishing');
    let result: SessionCompleteResponse;
    const sessionId = sessionIdRef.current;
    if (sessionId && cloudStorageAvailable) {
      try {
        result = await completeSession(sessionId);
      } catch {
        result = localSummary();
        setCloudStorageAvailable(false);
      }
    } else {
      result = localSummary();
    }
    setCompletion(result);
    if (result.suggested_stage !== interventionStage) {
      await setInterventionStage(result.suggested_stage);
    }
    setPhase('summary');
  }

  function close() {
    if (phase === 'active') {
      Alert.alert('要結束這次觀察嗎？', '系統會先整理目前已有的有效資料。', [
        { text: '繼續觀察', style: 'cancel' },
        { text: '結束並查看摘要', onPress: () => void finish() },
      ]);
      return;
    }
    router.back();
  }

  const cameraVisible = phase !== 'summary' && phase !== 'finishing';
  const statusTone = analysis?.status === 'attention' ? 'warning' : analysis?.valid ? 'success' : 'neutral';
  const statusLabel =
    phase === 'calibrating'
      ? `校準中 ${Math.min(CALIBRATION_SECONDS, Math.floor(elapsedSeconds))}/${CALIBRATION_SECONDS} 秒`
      : eventActive
        ? '提醒已觸發'
        : analysis?.status === 'attention'
          ? `持續偏移，再 ${reminderCountdown ?? ATTENTION_SECONDS} 秒提醒`
          : analysis?.valid
            ? '目前在個人基線範圍內'
            : '等待有效骨架';

  if (phase === 'summary' && completion) {
    return <SummaryView completion={completion} onRestart={() => void startCalibration()} />;
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right', 'bottom']}>
      <View style={styles.topBar}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="返回"
          onPress={close}
          style={({ pressed }) => [styles.iconButton, pressed && styles.buttonPressed]}>
          <MaterialIcons name="close" size={24} color={palette.ink} />
        </Pressable>
        <View style={styles.topTitle}>
          <Text style={styles.topEyebrow}>{demo ? '展示模式' : '即時骨架分析'}</Text>
          <Text style={styles.topHeading}>{VIEW_LABELS[viewMode]}</Text>
        </View>
        {phase === 'active' ? (
          <AppButton label="結束" variant="ghost" onPress={() => void finish()} />
        ) : (
          <View style={styles.topSpacer} />
        )}
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={[styles.workspace, isWide && styles.workspaceWide]}>
          <View style={[styles.previewColumn, isWide && styles.previewColumnWide]}>
            <View style={styles.preview}>
              {phase === 'finishing' ? (
                <View style={styles.finishingBackdrop} accessibilityLiveRegion="polite">
                  <View style={styles.finishingOrb}>
                    <ActivityIndicator size="large" color={palette.accent} />
                  </View>
                  <Text style={styles.finishingEyebrow}>AI SESSION SYNTHESIS</Text>
                  <Text style={styles.finishingTitle}>正在整理趨勢與下一步</Text>
                  <Text style={styles.finishingText}>計算良好坐姿率、主要偏移與提醒階段，雲端失敗時會安全切回本地摘要。</Text>
                </View>
              ) : demo ? (
                <View style={styles.demoBackdrop}>
                  <View style={styles.demoGridHorizontal} />
                  <View style={styles.demoGridVertical} />
                  <Text style={styles.demoLabel}>SIMULATED POSE STREAM</Text>
                </View>
              ) : permission?.granted && cameraVisible ? (
                <CameraView
                  ref={cameraRef}
                  style={StyleSheet.absoluteFill}
                  facing={facing}
                  mirror={facing === 'front'}
                  active={cameraVisible}
                  onCameraReady={() => setCameraReady(true)}
                  onMountError={(error) => setMessage(error.message)}
                />
              ) : (
                <View style={styles.cameraPlaceholder}>
                  <MaterialIcons name="photo-camera" size={42} color={palette.primary} />
                  <Text style={styles.placeholderTitle}>相機預覽會出現在這裡</Text>
                  <Text style={styles.placeholderText}>按下開始校準時才會要求相機權限。</Text>
                </View>
              )}
              {analysis?.landmarks.length ? (
                <PostureOverlay
                  landmarks={analysis.landmarks}
                  attention={analysis.status === 'attention'}
                />
              ) : null}
              {phase !== 'finishing' ? (
                <View style={styles.guideFrame}>
                  <View style={[styles.corner, styles.cornerTopLeft]} />
                  <View style={[styles.corner, styles.cornerTopRight]} />
                  <View style={[styles.corner, styles.cornerBottomLeft]} />
                  <View style={[styles.corner, styles.cornerBottomRight]} />
                </View>
              ) : null}
              {phase !== 'setup' && phase !== 'finishing' ? (
                <View style={styles.previewStatus} accessibilityLiveRegion="polite">
                  <StatusPill label={statusLabel} tone={eventActive ? 'warning' : statusTone} />
                </View>
              ) : null}
              {phase !== 'setup' && phase !== 'finishing' ? (
                <View style={styles.aiLiveBadge}>
                  <View style={styles.aiLiveDot} />
                  <Text style={styles.aiLiveText}>AI LIVE · 33 LANDMARKS</Text>
                </View>
              ) : null}
              {!demo && permission?.granted && cameraVisible ? (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="切換前後鏡頭"
                  onPress={() => setFacing((value) => (value === 'front' ? 'back' : 'front'))}
                  style={({ pressed }) => [styles.flipButton, pressed && styles.buttonPressed]}>
                  <MaterialIcons name="flip-camera-ios" size={22} color={palette.white} />
                </Pressable>
              ) : null}
            </View>

            {phase === 'calibrating' ? (
              <View style={styles.progressCard}>
                <View style={styles.progressCopy}>
                  <Text style={styles.progressTitle}>保持舒服的中性坐姿</Text>
                  <Text style={styles.progressText}>有效影格需達 80%，請先不要移動相機。</Text>
                </View>
                <View style={styles.progressTrack}>
                  <View style={[styles.progressFill, { width: `${progress * 100}%` }]} />
                </View>
              </View>
            ) : null}
          </View>

          <View style={[styles.panelColumn, isWide && styles.panelColumnWide]}>
            {phase === 'setup' ? (
              <SetupPanel
                viewMode={viewMode}
                demo={demo}
                message={message}
                onStart={() => void startCalibration()}
              />
            ) : (
              <LivePanel
                phase={phase}
                analysis={analysis}
                elapsedSeconds={elapsedSeconds}
                eventActive={eventActive}
                interventionStage={interventionStage}
                storageAvailable={cloudStorageAvailable}
                message={message}
              />
            )}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function SetupPanel({
  viewMode,
  demo,
  message,
  onStart,
}: {
  viewMode: ViewMode;
  demo: boolean;
  message: string | null;
  onStart: () => void;
}) {
  const { palette } = useAppTheme();
  const styles = useThemedStyles(createStyles);
  const points =
    viewMode === 'side'
      ? ['相機放在肩膀高度，拍到同側耳朵、肩膀與髖部。', '身體與鏡頭呈側面，避免桌面遮住髖部。']
      : ['相機正對身體中央，左右耳朵、肩膀與髖部都要入鏡。', '保持鏡頭水平，避免把相機傾斜當成肩線傾斜。'];
  return (
    <Surface style={styles.setupPanel}>
      <View style={styles.panelIcon}>
        <MaterialIcons name="center-focus-strong" size={28} color={palette.primary} />
      </View>
      <Text style={styles.panelEyebrow}>開始前 30 秒</Text>
      <Text style={styles.panelTitle}>先把畫面設定好</Text>
      <Text style={styles.panelLead}>接著會用 10 秒建立你的個人基線。基線是舒服、可維持的坐姿，不是刻意挺直。</Text>
      <View style={styles.checkList}>
        {points.map((point) => (
          <View key={point} style={styles.checkRow}>
            <MaterialIcons name="check-circle" size={20} color={palette.success} />
            <Text style={styles.checkText}>{point}</Text>
          </View>
        ))}
        <View style={styles.checkRow}>
          <MaterialIcons name="check-circle" size={20} color={palette.success} />
          <Text style={styles.checkText}>校準後若移動相機或換座位，請重新開始。</Text>
        </View>
      </View>
      {message ? (
        <View style={styles.errorBox}>
          <MaterialIcons name="error-outline" size={20} color={palette.warning} />
          <Text style={styles.errorText}>{message}</Text>
        </View>
      ) : null}
      <AppButton
        label={demo ? '開始 10 秒展示校準' : '開始 10 秒校準'}
        icon="play-arrow"
        fullWidth
        onPress={onStart}
      />
      <Text style={styles.disclaimer}>本系統提供姿勢覺察，不是醫療診斷；若出現疼痛或不適請停止使用。</Text>
    </Surface>
  );
}

function LivePanel({
  phase,
  analysis,
  elapsedSeconds,
  eventActive,
  interventionStage,
  storageAvailable,
  message,
}: {
  phase: Phase;
  analysis: AnalysisResponse | null;
  elapsedSeconds: number;
  eventActive: boolean;
  interventionStage: InterventionStage;
  storageAvailable: boolean;
  message: string | null;
}) {
  const { palette } = useAppTheme();
  const styles = useThemedStyles(createStyles);
  const metrics = Object.entries(analysis?.deviations || {});
  return (
    <View style={styles.liveStack}>
      <Surface tone={eventActive ? 'danger' : analysis?.status === 'attention' ? 'amber' : 'ai'} style={styles.scoreCard}>
        <ScoreGauge value={analysis?.posture_score ?? null} size={126} />
        <View style={styles.scoreCopy}>
          <Text style={styles.panelEyebrow}>{phase === 'calibrating' ? '建立個人基線' : STAGE_LABELS[interventionStage]}</Text>
          <Text style={styles.scoreTitle}>
            {eventActive ? '慢慢回到舒服坐姿' : analysis?.status === 'attention' ? '角度正在偏移' : '保持自然呼吸'}
          </Text>
          <Text style={styles.scoreText}>{analysis?.message || '正在等待下一個有效影格。'}</Text>
        </View>
      </Surface>

      <Surface style={styles.liveMetrics}>
        <View style={styles.liveHeader}>
          <Text style={styles.liveTitle}>即時角度偏移</Text>
          <Text style={styles.timer}>{formatDuration(elapsedSeconds)}</Text>
        </View>
        {metrics.length ? (
          metrics.map(([key, value]) => {
            const threshold = analysis?.thresholds[key] || 1;
            const exceeded = Math.abs(value) > threshold;
            return (
              <View key={key} style={styles.angleRow}>
                <View style={[styles.angleDot, { backgroundColor: exceeded ? palette.warning : palette.success }]} />
                <Text style={styles.angleLabel}>{metricLabel(key)}</Text>
                <Text style={[styles.angleValue, exceeded && styles.angleValueWarning]}>
                  {value > 0 ? '+' : ''}{value.toFixed(1)}°
                </Text>
                <Text style={styles.angleThreshold}>門檻 ±{threshold}°</Text>
              </View>
            );
          })
        ) : (
          <Text style={styles.waitingText}>校準完成後會顯示相對個人基線的角度。</Text>
        )}
      </Surface>

      <View style={styles.diagnosticRow}>
        <StatusPill
          label={analysis?.valid ? `骨架品質 ${Math.round(analysis.quality * 100)}%` : '骨架節點不足'}
          tone={analysis?.valid ? 'success' : 'warning'}
        />
        <StatusPill label={storageAvailable ? '衍生資料已連線' : '離線摘要'} tone={storageAvailable ? 'success' : 'neutral'} />
      </View>
      {message ? (
        <View style={styles.errorBox}>
          <MaterialIcons name="error-outline" size={20} color={palette.warning} />
          <Text style={styles.errorText}>{message}</Text>
        </View>
      ) : null}
    </View>
  );
}

function metricLabel(key: string): string {
  const labels: Record<string, string> = {
    neck_flexion: '頭頸前傾',
    trunk_flexion: '軀幹前傾',
    head_tilt: '頭部側傾',
    shoulder_tilt: '肩線傾斜',
    trunk_lateral: '軀幹側傾',
  };
  return labels[key] || key;
}

function SummaryView({
  completion,
  onRestart,
}: {
  completion: SessionCompleteResponse;
  onRestart: () => void;
}) {
  const { palette } = useAppTheme();
  const styles = useThemedStyles(createStyles);
  const { summary } = completion;
  const [reminderFit, setReminderFit] = useState<ReminderFit | null>(null);
  const [feeling, setFeeling] = useState<SessionFeeling | null>(null);
  const [feedbackStatus, setFeedbackStatus] = useState<'idle' | 'saving' | 'saved' | 'offline'>('idle');

  async function saveFeedback() {
    if (!reminderFit) return;
    if (summary.id.startsWith('local-')) {
      setFeedbackStatus('offline');
      return;
    }
    setFeedbackStatus('saving');
    try {
      await submitSessionFeedback(summary.id, { reminder_fit: reminderFit, feeling });
      setFeedbackStatus('saved');
    } catch {
      setFeedbackStatus('offline');
    }
  }
  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right', 'bottom']}>
      <ScrollView contentContainerStyle={styles.summaryPage}>
        <View style={styles.summaryBrand}>
          <BrandMark />
          <Text style={styles.summaryBrandText}>姿勢守衛隊</Text>
        </View>
        <Surface style={styles.summaryHero}>
          <StatusPill label="工作階段已完成" tone="success" />
          <Text style={styles.summaryHeading}>更快察覺變化，就是這次的進步。</Text>
          <ScoreGauge value={summary.good_posture_rate} size={160} label="良好坐姿率" />
          <Text style={styles.summaryCaption}>有效時間內，未處於持續姿勢事件的比例</Text>
        </Surface>
        <View style={styles.summaryMetrics}>
          <SummaryMetric label="有效觀察" value={formatDuration(summary.valid_seconds)} icon="schedule" />
          <SummaryMetric label="提醒事件" value={`${summary.posture_event_count} 次`} icon="notifications-active" />
          <SummaryMetric label="平均分數" value={`${Math.round(summary.average_score)} 分`} icon="insights" />
        </View>
        <Surface tone="dark" style={styles.summaryInsight}>
          <View style={styles.coachIcon}>
            <MaterialIcons name="auto-awesome" size={26} color={palette.onDarkAccent} />
          </View>
          <View style={styles.summaryInsightCopy}>
            <Text style={styles.summaryInsightEyebrow}>
              {summary.insight_provider === 'foundry' ? 'MICROSOFT FOUNDRY 建議' : '規則式離線建議'}
            </Text>
            <Text style={styles.summaryInsightText}>{summary.insight_text}</Text>
          </View>
        </Surface>
        <Surface tone="amber" style={styles.stageReason}>
          <Text style={styles.stageReasonTitle}>下一階段：{STAGE_LABELS[completion.suggested_stage]}</Text>
          <Text style={styles.stageReasonText}>{completion.stage_reason}</Text>
        </Surface>
        <Surface style={styles.feedbackCard}>
          <View style={styles.feedbackHeading}>
            <View style={styles.feedbackHeadingCopy}>
              <Text style={styles.panelEyebrow}>REMINDER EXPERIENCE</Text>
              <Text style={styles.feedbackTitle}>剛才的提醒感受如何？</Text>
            </View>
            <MaterialIcons name="sentiment-satisfied" size={28} color={palette.accent} />
          </View>
          <Text style={styles.feedbackLead}>只收集分類選項、不收自由文字，讓團隊能改進提醒而不增加未成年使用者個資。</Text>
          <Text style={styles.feedbackLabel}>提醒強度</Text>
          <View style={styles.feedbackOptions} accessibilityRole="radiogroup">
            <FeedbackChoice label="剛剛好" selected={reminderFit === 'just_right'} onPress={() => setReminderFit('just_right')} />
            <FeedbackChoice label="太頻繁" selected={reminderFit === 'too_frequent'} onPress={() => setReminderFit('too_frequent')} />
            <FeedbackChoice label="不容易注意" selected={reminderFit === 'easy_to_miss'} onPress={() => setReminderFit('easy_to_miss')} />
          </View>
          <Text style={styles.feedbackLabel}>當下心情（選填）</Text>
          <View style={styles.feedbackOptions} accessibilityRole="radiogroup">
            <FeedbackChoice label="有掌控感" selected={feeling === 'in_control'} onPress={() => setFeeling('in_control')} />
            <FeedbackChoice label="被打斷" selected={feeling === 'interrupted'} onPress={() => setFeeling('interrupted')} />
            <FeedbackChoice label="沒有明顯感覺" selected={feeling === 'neutral'} onPress={() => setFeeling('neutral')} />
          </View>
          <AppButton
            label={feedbackStatus === 'saved' ? '已送出感受' : feedbackStatus === 'offline' ? '目前離線，未送出' : '送出感受'}
            icon={feedbackStatus === 'saved' ? 'check' : 'send'}
            variant={feedbackStatus === 'saved' ? 'ghost' : 'secondary'}
            loading={feedbackStatus === 'saving'}
            disabled={!reminderFit || feedbackStatus === 'saved' || feedbackStatus === 'offline'}
            onPress={() => void saveFeedback()}
          />
        </Surface>
        <View style={styles.summaryActions}>
          <AppButton label="回到首頁" variant="secondary" onPress={() => router.replace('/')} />
          <AppButton label="再測一次" icon="replay" onPress={onRestart} />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function FeedbackChoice({ label, selected, onPress }: { label: string; selected: boolean; onPress: () => void }) {
  const styles = useThemedStyles(createStyles);
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ checked: selected }}
      accessibilityLabel={label}
      onPress={onPress}
      style={({ pressed }) => [
        styles.feedbackChoice,
        selected && styles.feedbackChoiceSelected,
        pressed && styles.buttonPressed,
      ]}>
      <View style={[styles.feedbackRadio, selected && styles.feedbackRadioSelected]}>
        {selected ? <View style={styles.feedbackRadioDot} /> : null}
      </View>
      <Text style={[styles.feedbackChoiceText, selected && styles.feedbackChoiceTextSelected]}>{label}</Text>
    </Pressable>
  );
}

function SummaryMetric({
  label,
  value,
  icon,
}: {
  label: string;
  value: string;
  icon: keyof typeof MaterialIcons.glyphMap;
}) {
  const { palette } = useAppTheme();
  const styles = useThemedStyles(createStyles);
  return (
    <Surface style={styles.summaryMetric}>
      <MaterialIcons name={icon} size={24} color={palette.primary} />
      <Text style={styles.summaryMetricLabel}>{label}</Text>
      <Text style={styles.summaryMetricValue}>{value}</Text>
    </Surface>
  );
}

const createStyles = (palette: ThemePalette) => StyleSheet.create({
  safe: { flex: 1, backgroundColor: palette.canvas },
  topBar: { width: '100%', maxWidth: 1180, alignSelf: 'center', minHeight: 72, paddingHorizontal: Spacing.md, flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  iconButton: { width: 48, height: 48, borderRadius: Radius.sm, alignItems: 'center', justifyContent: 'center', backgroundColor: palette.surface, borderWidth: 1, borderColor: palette.line },
  topTitle: { flex: 1 },
  topEyebrow: { fontFamily: Typography.family, color: palette.primary, fontSize: Typography.caption, fontWeight: '900', letterSpacing: 0.8 },
  topHeading: { fontFamily: Typography.displayFamily, color: palette.ink, fontSize: Typography.h3, fontWeight: '700' },
  topSpacer: { width: 48 },
  content: { width: '100%', maxWidth: 1180, alignSelf: 'center', padding: Spacing.md, paddingBottom: Spacing.xxl },
  workspace: { gap: Spacing.lg },
  workspaceWide: { flexDirection: 'row', alignItems: 'flex-start' },
  previewColumn: { gap: Spacing.md, minWidth: 0 },
  previewColumnWide: { flex: 1.2 },
  panelColumn: { minWidth: 0 },
  panelColumnWide: { flex: 0.8 },
  preview: { width: '100%', aspectRatio: 4 / 3, maxHeight: 650, overflow: 'hidden', borderRadius: Radius.lg, backgroundColor: palette.canvasRaised, borderWidth: 1, borderColor: palette.lineBright },
  demoBackdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: palette.inverseSurface, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  demoGridHorizontal: { position: 'absolute', left: 0, right: 0, top: '50%', height: 1, backgroundColor: palette.lineBright },
  demoGridVertical: { position: 'absolute', top: 0, bottom: 0, left: '50%', width: 1, backgroundColor: palette.lineBright },
  demoLabel: { position: 'absolute', right: 18, top: 18, fontFamily: 'monospace', color: palette.onDarkAccent, fontSize: 11, letterSpacing: 1 },
  finishingBackdrop: { flex: 1, minHeight: 280, backgroundColor: palette.canvasRaised, alignItems: 'center', justifyContent: 'center', padding: Spacing.xl, gap: Spacing.sm },
  finishingOrb: { width: 78, height: 78, borderRadius: Radius.sm, backgroundColor: palette.accentPale, borderWidth: 1, borderColor: palette.lineBright, alignItems: 'center', justifyContent: 'center', marginBottom: Spacing.sm },
  finishingEyebrow: { color: palette.accent, fontFamily: Typography.family, fontSize: Typography.caption, fontWeight: '900', letterSpacing: 1 },
  finishingTitle: { color: palette.ink, fontFamily: Typography.displayFamily, fontSize: Typography.h2, fontWeight: '700', textAlign: 'center' },
  finishingText: { color: palette.inkSoft, fontFamily: Typography.family, fontSize: Typography.small, lineHeight: 21, textAlign: 'center', maxWidth: 480 },
  cameraPlaceholder: { flex: 1, backgroundColor: palette.primaryPale, alignItems: 'center', justifyContent: 'center', padding: Spacing.lg, gap: Spacing.sm },
  placeholderTitle: { fontFamily: Typography.displayFamily, color: palette.ink, fontSize: Typography.h3, fontWeight: '700', textAlign: 'center' },
  placeholderText: { fontFamily: Typography.family, color: palette.inkSoft, fontSize: Typography.small, textAlign: 'center' },
  guideFrame: { ...StyleSheet.absoluteFillObject, margin: 22, pointerEvents: 'none' },
  corner: { position: 'absolute', width: 30, height: 30, borderColor: 'rgba(255,255,255,0.72)' },
  cornerTopLeft: { left: 0, top: 0, borderLeftWidth: 3, borderTopWidth: 3 },
  cornerTopRight: { right: 0, top: 0, borderRightWidth: 3, borderTopWidth: 3 },
  cornerBottomLeft: { left: 0, bottom: 0, borderLeftWidth: 3, borderBottomWidth: 3 },
  cornerBottomRight: { right: 0, bottom: 0, borderRightWidth: 3, borderBottomWidth: 3 },
  previewStatus: { position: 'absolute', left: 16, bottom: 16 },
  aiLiveBadge: { position: 'absolute', left: 16, top: 16, minHeight: 32, flexDirection: 'row', alignItems: 'center', gap: 7, backgroundColor: palette.overlay, borderRadius: Radius.pill, borderWidth: 1, borderColor: palette.lineBright, paddingHorizontal: Spacing.sm },
  aiLiveDot: { width: 7, height: 7, borderRadius: 0, backgroundColor: palette.onDarkAccent },
  aiLiveText: { color: palette.onDarkAccent, fontFamily: 'monospace', fontSize: 10, fontWeight: '800', letterSpacing: 0.7 },
  flipButton: { position: 'absolute', right: 16, top: 16, width: 48, height: 48, borderRadius: Radius.sm, alignItems: 'center', justifyContent: 'center', backgroundColor: palette.overlay, borderWidth: 1, borderColor: palette.inverseLine },
  progressCard: { gap: Spacing.sm, backgroundColor: palette.surface, borderRadius: Radius.md, borderWidth: 1, borderColor: palette.line, padding: Spacing.md },
  progressCopy: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: Spacing.sm },
  progressTitle: { fontFamily: Typography.family, color: palette.ink, fontSize: Typography.small, fontWeight: '900' },
  progressText: { fontFamily: Typography.family, color: palette.inkSoft, fontSize: Typography.caption, flexShrink: 1, textAlign: 'right' },
  progressTrack: { height: 9, overflow: 'hidden', borderRadius: Radius.pill, backgroundColor: palette.surfaceMuted },
  progressFill: { height: '100%', borderRadius: Radius.pill, backgroundColor: palette.primary },
  setupPanel: { gap: Spacing.md },
  panelIcon: { width: 58, height: 58, borderRadius: Radius.sm, alignItems: 'center', justifyContent: 'center', backgroundColor: palette.primaryPale, borderWidth: 1, borderColor: palette.primaryDark },
  panelEyebrow: { fontFamily: Typography.family, color: palette.primary, fontSize: Typography.caption, fontWeight: '900', letterSpacing: 0.7 },
  panelTitle: { fontFamily: Typography.displayFamily, color: palette.ink, fontSize: Typography.h2, fontWeight: '700' },
  panelLead: { fontFamily: Typography.family, color: palette.inkSoft, fontSize: Typography.small, lineHeight: 22 },
  checkList: { gap: Spacing.sm, paddingVertical: Spacing.xs },
  checkRow: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.sm },
  checkText: { flex: 1, fontFamily: Typography.family, color: palette.ink, fontSize: Typography.small, lineHeight: 21 },
  errorBox: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.sm, padding: Spacing.sm, borderRadius: Radius.sm, backgroundColor: palette.warningPale },
  errorText: { flex: 1, fontFamily: Typography.family, color: palette.warningText, fontSize: Typography.caption, lineHeight: 19 },
  disclaimer: { fontFamily: Typography.family, color: palette.inkSoft, fontSize: Typography.caption, lineHeight: 18, textAlign: 'center' },
  liveStack: { gap: Spacing.md },
  scoreCard: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, padding: Spacing.md },
  scoreCopy: { flex: 1, gap: 4 },
  scoreTitle: { fontFamily: Typography.displayFamily, color: palette.ink, fontSize: Typography.h3, fontWeight: '700' },
  scoreText: { fontFamily: Typography.family, color: palette.inkSoft, fontSize: Typography.caption, lineHeight: 19 },
  liveMetrics: { gap: Spacing.sm, padding: Spacing.md },
  liveHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  liveTitle: { fontFamily: Typography.family, color: palette.ink, fontSize: Typography.body, fontWeight: '900' },
  timer: { fontFamily: 'monospace', color: palette.primary, fontSize: Typography.small, fontWeight: '700' },
  angleRow: { minHeight: 48, flexDirection: 'row', alignItems: 'center', gap: Spacing.xs, borderTopWidth: 1, borderTopColor: palette.line },
  angleDot: { width: 8, height: 8, borderRadius: 4 },
  angleLabel: { flex: 1, fontFamily: Typography.family, color: palette.ink, fontSize: Typography.small, fontWeight: '700' },
  angleValue: { fontFamily: 'monospace', color: palette.success, fontSize: Typography.body, fontWeight: '900' },
  angleValueWarning: { color: palette.warning },
  angleThreshold: { width: 86, fontFamily: Typography.family, color: palette.inkSoft, fontSize: Typography.caption, textAlign: 'right' },
  waitingText: { fontFamily: Typography.family, color: palette.inkSoft, fontSize: Typography.small, lineHeight: 21, paddingVertical: Spacing.md },
  diagnosticRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.xs },
  summaryPage: { width: '100%', maxWidth: 900, alignSelf: 'center', padding: Spacing.md, paddingBottom: Spacing.xxl, gap: Spacing.lg },
  summaryBrand: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, minHeight: 58 },
  summaryBrandText: { fontFamily: Typography.displayFamily, color: palette.ink, fontSize: Typography.h3, fontWeight: '700' },
  summaryHero: { alignItems: 'center', gap: Spacing.lg, paddingVertical: Spacing.xl },
  summaryHeading: { fontFamily: Typography.displayFamily, color: palette.ink, fontSize: Typography.h1, lineHeight: 39, fontWeight: '700', textAlign: 'center' },
  summaryCaption: { fontFamily: Typography.family, color: palette.inkSoft, fontSize: Typography.caption, textAlign: 'center' },
  summaryMetrics: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.md },
  summaryMetric: { flex: 1, minWidth: 180, gap: Spacing.xs, padding: Spacing.md },
  summaryMetricLabel: { fontFamily: Typography.family, color: palette.inkSoft, fontSize: Typography.caption, fontWeight: '700' },
  summaryMetricValue: { fontFamily: Typography.displayFamily, color: palette.ink, fontSize: Typography.h3, fontWeight: '700' },
  summaryInsight: { flexDirection: 'row', gap: Spacing.md, alignItems: 'flex-start' },
  coachIcon: { width: 52, height: 52, borderRadius: Radius.sm, alignItems: 'center', justifyContent: 'center', backgroundColor: palette.accentPale, borderWidth: 1, borderColor: palette.accent },
  summaryInsightCopy: { flex: 1, gap: Spacing.xs },
  summaryInsightEyebrow: { fontFamily: Typography.family, color: palette.onDarkAccent, fontSize: Typography.caption, fontWeight: '900', letterSpacing: 0.7 },
  summaryInsightText: { fontFamily: Typography.family, color: palette.white, fontSize: Typography.body, lineHeight: 25 },
  stageReason: { gap: Spacing.xs },
  stageReasonTitle: { fontFamily: Typography.family, color: palette.warningText, fontSize: Typography.body, fontWeight: '900' },
  stageReasonText: { fontFamily: Typography.family, color: palette.warningTextSoft, fontSize: Typography.small, lineHeight: 21 },
  feedbackCard: { gap: Spacing.md },
  feedbackHeading: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  feedbackHeadingCopy: { flex: 1, gap: 4 },
  feedbackTitle: { fontFamily: Typography.displayFamily, color: palette.ink, fontSize: Typography.h3, fontWeight: '700' },
  feedbackLead: { fontFamily: Typography.family, color: palette.inkSoft, fontSize: Typography.caption, lineHeight: 19 },
  feedbackLabel: { fontFamily: Typography.family, color: palette.ink, fontSize: Typography.small, fontWeight: '800' },
  feedbackOptions: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.xs },
  feedbackChoice: { minHeight: 46, flexDirection: 'row', alignItems: 'center', gap: 7, borderRadius: Radius.pill, paddingHorizontal: Spacing.sm, borderWidth: 1, borderColor: palette.line, backgroundColor: palette.canvasRaised },
  feedbackChoiceSelected: { borderColor: palette.primary, backgroundColor: palette.primaryPale },
  feedbackRadio: { width: 18, height: 18, borderRadius: 9, borderWidth: 1.5, borderColor: palette.inkSoft, alignItems: 'center', justifyContent: 'center' },
  feedbackRadioSelected: { borderColor: palette.primaryDark },
  feedbackRadioDot: { width: 9, height: 9, borderRadius: 5, backgroundColor: palette.primaryDark },
  feedbackChoiceText: { fontFamily: Typography.family, color: palette.inkSoft, fontSize: Typography.caption, fontWeight: '700' },
  feedbackChoiceTextSelected: { color: palette.ink },
  summaryActions: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: Spacing.sm },
  buttonPressed: { opacity: 0.72, transform: [{ scale: 0.97 }] },
});
