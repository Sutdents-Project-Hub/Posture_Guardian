export type ViewMode = 'side' | 'front';
export type InterventionStage = 'starter' | 'advanced' | 'intensive';
export type AnalysisStatus = 'calibrating' | 'good' | 'attention' | 'invalid';

export type Landmark = {
  index: number;
  name: string;
  x: number;
  y: number;
  z: number;
  visibility: number;
};

export type AnalysisResponse = {
  view_mode: ViewMode;
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
  insight_provider: 'foundry' | 'fallback';
  insight_model: string | null;
  insight_prompt_version: string;
};

export type SessionSummary = {
  id: string;
  view_mode: ViewMode;
  intervention_stage: InterventionStage;
  started_at: string;
  ended_at: string | null;
  valid_seconds: number;
  good_seconds: number;
  invalid_seconds: number;
  posture_event_count: number;
  average_score: number;
  good_posture_rate: number;
  primary_issue: string | null;
  insight_text: string | null;
  insight_provider: string;
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
  posture_score: number;
  metrics: Record<string, number>;
  deviations: Record<string, number>;
  reasons: string[];
};

export type ReminderFit = 'just_right' | 'too_frequent' | 'easy_to_miss';
export type SessionFeeling = 'interrupted' | 'in_control' | 'neutral';
