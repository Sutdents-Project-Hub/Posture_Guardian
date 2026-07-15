import type { AnalysisResponse, Landmark, ViewMode } from '@/types/posture';

function demoLandmarks(viewMode: ViewMode, elapsedSeconds: number, attention: boolean): Landmark[] {
  const points: Record<number, [number, number]> =
    viewMode === 'side'
      ? {
          7: [attention ? 0.62 : 0.54, 0.18],
          8: [0.5, 0.19],
          11: [0.51, 0.34],
          12: [0.49, 0.35],
          13: [0.58, 0.49],
          14: [0.49, 0.49],
          15: [0.65, 0.59],
          16: [0.5, 0.59],
          23: [0.48, 0.61],
          24: [0.47, 0.62],
          25: [0.49, 0.77],
          26: [0.47, 0.77],
          27: [0.49, 0.94],
          28: [0.47, 0.94],
        }
      : {
          7: [0.43, attention ? 0.2 : 0.18],
          8: [0.57, attention ? 0.15 : 0.18],
          11: [0.38, attention ? 0.37 : 0.34],
          12: [0.62, attention ? 0.31 : 0.34],
          13: [0.31, 0.5],
          14: [0.69, 0.5],
          15: [0.28, 0.62],
          16: [0.72, 0.62],
          23: [0.43, 0.62],
          24: [0.57, 0.62],
          25: [0.42, 0.78],
          26: [0.58, 0.78],
          27: [0.41, 0.95],
          28: [0.59, 0.95],
        };
  return Array.from({ length: 33 }, (_, index) => {
    const [x, y] = points[index] || [0.5, 0.14 + index * 0.002];
    return { index, name: `landmark_${index}`, x, y, z: 0, visibility: points[index] ? 0.98 : 0.35 };
  });
}

export function createDemoAnalysis(
  viewMode: ViewMode,
  elapsedSeconds: number,
  baseline?: Record<string, number>,
): AnalysisResponse {
  const cycle = elapsedSeconds % 24;
  const attention = Boolean(baseline) && cycle >= 4 && cycle < 17;
  const noise = Math.sin(elapsedSeconds * 1.7) * 0.5;
  const raw: Record<string, number> =
    viewMode === 'side'
      ? {
          neck_flexion: 6 + noise + (attention ? 18 : 0),
          trunk_flexion: 2 + noise + (attention ? 13 : 0),
        }
      : {
          head_tilt: 1 + noise + (attention ? 12 : 0),
          shoulder_tilt: 0.5 + noise + (attention ? 7 : 0),
          trunk_lateral: 1 + noise + (attention ? 10 : 0),
        };
  const metrics = Object.fromEntries(Object.entries(raw).map(([key, value]) => [key, +value.toFixed(2)]));
  const thresholds: Record<string, number> =
    viewMode === 'side'
      ? { neck_flexion: 15, trunk_flexion: 10 }
      : { head_tilt: 10, shoulder_tilt: 5, trunk_lateral: 8 };
  const deviations = baseline
    ? Object.fromEntries(
        Object.entries(metrics).map(([key, value]) => [key, +(value - (baseline[key] ?? value)).toFixed(2)]),
      )
    : {};
  const reasons = attention
    ? viewMode === 'side'
      ? ['頭頸前傾角度偏移', '軀幹前傾角度偏移']
      : ['頭部側傾角度偏移', '左右肩線傾斜']
    : [];
  return {
    view_mode: viewMode,
    valid: true,
    quality: 0.98,
    status: baseline ? (attention ? 'attention' : 'good') : 'calibrating',
    posture_score: attention ? 38 : 91,
    metrics,
    deviations,
    thresholds,
    reasons,
    landmarks: demoLandmarks(viewMode, elapsedSeconds, attention),
    selected_side: viewMode === 'side' ? 'left' : null,
    message: attention
      ? '展示模式：角度正在偏離，維持 8 秒後才會提醒。'
      : baseline
        ? '展示模式：姿勢在個人校準範圍內。'
        : '展示模式：正在建立個人基線。',
  };
}
