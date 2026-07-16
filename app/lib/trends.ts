import type { SessionSummary } from '@/types/posture';

export const QUALIFIED_SESSION_SECONDS = 600;
export const TREND_SAMPLE_SIZE = 6;

export type PostureTrend = {
  completed: SessionSummary[];
  chartSessions: SessionSummary[];
  qualifiedCount: number;
  readinessPercent: number;
  hasComparison: boolean;
  previousAverage: number | null;
  recentAverage: number | null;
  improvement: number | null;
  primaryIssue: string | null;
};

export function buildPostureTrend(sessions: SessionSummary[]): PostureTrend {
  const completed = sessions
    .filter((session) => session.ended_at)
    .sort((a, b) => new Date(b.started_at).getTime() - new Date(a.started_at).getTime());
  const qualified = completed
    .filter((session) => session.valid_seconds >= QUALIFIED_SESSION_SECONDS)
    .slice(0, TREND_SAMPLE_SIZE);
  const recent = qualified.slice(0, 3);
  const previous = qualified.slice(3, 6);
  const average = (items: SessionSummary[]) =>
    items.reduce((sum, item) => sum + item.good_posture_rate, 0) / items.length;
  const recentAverage = recent.length === 3 ? average(recent) : null;
  const previousAverage = previous.length === 3 ? average(previous) : null;

  const issueCounts = new Map<string, number>();
  completed.slice(0, TREND_SAMPLE_SIZE).forEach((session) => {
    if (session.primary_issue) {
      issueCounts.set(session.primary_issue, (issueCounts.get(session.primary_issue) ?? 0) + 1);
    }
  });
  const primaryIssue = [...issueCounts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;

  return {
    completed,
    chartSessions: [...qualified].reverse(),
    qualifiedCount: qualified.length,
    readinessPercent: Math.round((qualified.length / TREND_SAMPLE_SIZE) * 100),
    hasComparison: qualified.length === TREND_SAMPLE_SIZE,
    previousAverage,
    recentAverage,
    improvement:
      recentAverage !== null && previousAverage !== null
        ? recentAverage - previousAverage
        : null,
    primaryIssue,
  };
}

export function nextCoachTask(trend: PostureTrend): { title: string; detail: string } {
  if (!trend.completed.length) {
    return {
      title: '完成第一個 10 分鐘觀察',
      detail: '先建立個人中性基線，AI 教練才會用你的資料提出下一步。',
    };
  }
  if (trend.primaryIssue) {
    return {
      title: `用 10 分鐘觀察「${trend.primaryIssue}」`,
      detail: '先調整螢幕或椅背，再重新校準；只改一件事，才能看出差異。',
    };
  }
  return {
    title: '維持舒服的中性坐姿 10 分鐘',
    detail: '不需要僵硬追求滿分，提醒出現時再慢慢回到個人基線。',
  };
}
