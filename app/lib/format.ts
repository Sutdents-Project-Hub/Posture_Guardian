import type { CoverageMode, InterventionStage, RequestedViewMode, ViewMode } from '@/types/posture';

export const STAGE_LABELS: Record<InterventionStage, string> = {
  starter: '初期提醒',
  advanced: '進階提醒',
  intensive: '加強介入',
};

export const VIEW_LABELS: Record<ViewMode, string> = {
  side: '側面視角',
  front: '正面視角',
};

export const CAPTURE_MODE_LABELS: Record<RequestedViewMode, string> = {
  auto: '房間自適應',
  side: '側面視角',
  front: '正面視角',
};

export const COVERAGE_LABELS: Record<CoverageMode, string> = {
  upper_body: '半身分析',
  full_body: '全身分析',
};

export function formatDuration(seconds: number): string {
  if (seconds < 60) return `${Math.round(seconds)} 秒`;
  const minutes = Math.floor(seconds / 60);
  const rest = Math.round(seconds % 60);
  return rest ? `${minutes} 分 ${rest} 秒` : `${minutes} 分鐘`;
}

export function formatDate(value: string): string {
  return new Intl.DateTimeFormat('zh-TW', {
    month: 'numeric',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value));
}
