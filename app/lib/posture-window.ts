import type { AnalysisResponse } from '@/types/posture';

const METRIC_LABELS: Record<string, string> = {
  neck_flexion: '頭頸前傾角度偏移',
  trunk_flexion: '軀幹前傾角度偏移',
  head_tilt: '頭部側傾角度偏移',
  shoulder_tilt: '左右肩線傾斜',
  trunk_lateral: '軀幹側傾角度偏移',
  knee_flexion: '膝部角度偏移',
  hip_tilt: '髖線傾斜',
  knee_tilt: '膝線傾斜',
};

export type DeviationFrame = {
  capturedAt: number;
  deviations: Record<string, number>;
};

function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
}

export function smoothAnalysis(
  analysis: AnalysisResponse,
  frames: DeviationFrame[],
  capturedAt: number,
  windowMs = 5000,
): { analysis: AnalysisResponse; frames: DeviationFrame[] } {
  const recent = frames.filter((frame) => capturedAt - frame.capturedAt <= windowMs);
  if (!analysis.valid || !Object.keys(analysis.deviations).length) {
    return { analysis, frames: recent };
  }

  const nextFrames = [...recent, { capturedAt, deviations: analysis.deviations }];
  const deviations = Object.fromEntries(
    Object.keys(analysis.deviations).map((metric) => [
      metric,
      +median(nextFrames.map((frame) => frame.deviations[metric]).filter(Number.isFinite)).toFixed(2),
    ]),
  );
  const exceeded = Object.entries(deviations)
    .filter(([metric, value]) => Math.abs(value) > analysis.thresholds[metric])
    .map(([metric]) => metric);
  const maxRatio = Math.max(
    0,
    ...Object.entries(analysis.thresholds).map(
      ([metric, threshold]) => Math.abs(deviations[metric] ?? 0) / threshold,
    ),
  );

  return {
    frames: nextFrames,
    analysis: {
      ...analysis,
      deviations,
      status: exceeded.length ? 'attention' : 'good',
      posture_score: +Math.max(0, 100 - Math.min(100, maxRatio * 50)).toFixed(1),
      reasons: exceeded.map((metric) => METRIC_LABELS[metric] ?? metric),
      message: exceeded.length
        ? '平滑角度持續偏離；有效偏移累積 8 秒後才會提醒。'
        : '姿勢在個人校準範圍內。',
    },
  };
}

export type PostureEventWindow = {
  attentionSeconds: number;
  recoverySeconds: number;
  eventActive: boolean;
};

export const EMPTY_EVENT_WINDOW: PostureEventWindow = {
  attentionSeconds: 0,
  recoverySeconds: 0,
  eventActive: false,
};

export function advanceEventWindow(
  state: PostureEventWindow,
  sample: { valid: boolean; attention: boolean; durationSeconds: number },
  limits = { attentionSeconds: 8, recoverySeconds: 3 },
): { state: PostureEventWindow; activated: boolean; recovered: boolean } {
  if (!sample.valid) {
    return {
      state: {
        ...state,
        recoverySeconds: state.eventActive ? 0 : state.recoverySeconds,
      },
      activated: false,
      recovered: false,
    };
  }

  if (sample.attention) {
    const attentionSeconds = state.eventActive
      ? state.attentionSeconds
      : state.attentionSeconds + sample.durationSeconds;
    const eventActive = state.eventActive || attentionSeconds >= limits.attentionSeconds;
    return {
      state: { attentionSeconds, recoverySeconds: 0, eventActive },
      activated: !state.eventActive && eventActive,
      recovered: false,
    };
  }

  if (!state.eventActive) {
    return { state: EMPTY_EVENT_WINDOW, activated: false, recovered: false };
  }

  const recoverySeconds = state.recoverySeconds + sample.durationSeconds;
  if (recoverySeconds >= limits.recoverySeconds) {
    return { state: EMPTY_EVENT_WINDOW, activated: false, recovered: true };
  }
  return {
    state: { attentionSeconds: state.attentionSeconds, recoverySeconds, eventActive: true },
    activated: false,
    recovered: false,
  };
}
