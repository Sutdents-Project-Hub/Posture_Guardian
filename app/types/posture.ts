export type ViewMode = 'side' | 'front';
export type RequestedViewMode = ViewMode | 'auto';
export type CoverageMode = 'upper_body' | 'full_body';
export type DistanceStatus = 'near' | 'recommended' | 'far' | 'unknown';
export type FramingStatus = 'complete' | 'partial' | 'out_of_frame';
export type InterventionStage = 'starter' | 'advanced' | 'intensive';
export type AnalysisStatus = 'calibrating' | 'good' | 'attention' | 'invalid';
export type InsightProvider = 'liangjie' | 'fallback' | 'foundry';

export type Landmark = {
  index: number;
  name: string;
  x: number;
  y: number;
  z: number;
  visibility: number;
};

export type AnalysisResponse = {
  requested_view_mode: RequestedViewMode;
  view_mode: ViewMode | null;
  coverage_mode: CoverageMode;
  distance: DistanceStatus;
  framing: FramingStatus;
  subject_scale: number;
  image_width: number;
  image_height: number;
  quality_issues: string[];
  pose_count: number;
  valid: boolean;
  quality: number;
  status: AnalysisStatus;
  posture_score: number;
  metrics: Record<string, number>;
  deviations: Record<string, number>;
  thresholds: Record<string, number>;
  reasons: string[];
  landmarks: Landmark[];
  selected_side: 'left' | 'right' | null;
  message: string;
};

export type HealthResponse = {
  status: 'ok' | 'degraded';
  database: 'ok' | 'error';
  pose_model: 'ready' | 'missing';
  insight_provider: 'liangjie' | 'fallback';
  insight_configured: boolean;
  insight_api_mode: 'chat_completions' | 'responses' | null;
  insight_model: string | null;
  insight_prompt_version: string;
};

export type SessionSummary = {
  id: string;
  view_mode: RequestedViewMode;
  coverage_mode: CoverageMode;
  room_mode: boolean;
  intervention_stage: InterventionStage;
  started_at: string;
  ended_at: string | null;
  valid_seconds: number;
  good_seconds: number;
  attention_seconds: number;
  poor_seconds: number;
  invalid_seconds: number;
  posture_event_count: number;
  reminder_count: number;
  average_score: number;
  good_posture_rate: number;
  primary_issue: string | null;
  insight_text: string | null;
  insight_provider: InsightProvider;
};

export type SessionCompleteResponse = {
  summary: SessionSummary;
  suggested_stage: InterventionStage;
  stage_reason: string;
};

export type SessionSample = {
  duration_seconds: number;
  is_valid: boolean;
  threshold_exceeded: boolean;
  event_active: boolean;
  reminder_triggered: boolean;
  posture_score: number;
  metrics: Record<string, number>;
  deviations: Record<string, number>;
  reasons: string[];
};

export type ReminderFit = 'just_right' | 'too_frequent' | 'easy_to_miss';
export type SessionFeeling = 'interrupted' | 'in_control' | 'neutral';

export type WeeklyTimePeriod = {
  period: 'overnight' | 'morning' | 'afternoon' | 'evening';
  label: string;
  valid_seconds: number;
  good_seconds: number;
  attention_seconds: number;
  poor_seconds: number;
  good_posture_rate: number;
  reminder_count: number;
};

export type WeeklyReport = {
  period_start: string;
  period_end: string;
  timezone: string;
  session_count: number;
  valid_seconds: number;
  good_seconds: number;
  attention_seconds: number;
  poor_seconds: number;
  invalid_seconds: number;
  reminder_count: number;
  good_posture_rate: number;
  status_distribution: {
    good_seconds: number;
    attention_seconds: number;
    poor_seconds: number;
    invalid_seconds: number;
  };
  time_periods: WeeklyTimePeriod[];
  primary_issue: string | null;
  insight_text: string;
  insight_provider: InsightProvider;
};
