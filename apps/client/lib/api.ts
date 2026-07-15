import { Platform } from 'react-native';

import type {
  AnalysisResponse,
  HealthResponse,
  InterventionStage,
  SessionCompleteResponse,
  SessionSample,
  SessionSummary,
  ViewMode,
} from '@/types/posture';

const configuredUrl = process.env.EXPO_PUBLIC_API_BASE_URL?.trim();
export const API_BASE_URL = (configuredUrl || 'http://localhost:8000').replace(/\/$/, '');

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status?: number,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers: {
      Accept: 'application/json',
      ...init?.headers,
    },
  });
  if (!response.ok) {
    let detail = `伺服器回應 ${response.status}`;
    try {
      const body = (await response.json()) as { detail?: string };
      detail = body.detail || detail;
    } catch {
      // Keep the status-based message when a proxy returns non-JSON content.
    }
    throw new ApiError(detail, response.status);
  }
  return (await response.json()) as T;
}

export async function getHealth(): Promise<HealthResponse> {
  return request<HealthResponse>('/health');
}

async function imagePart(uri: string): Promise<Blob | { uri: string; name: string; type: string }> {
  if (Platform.OS === 'web') {
    const response = await fetch(uri);
    return response.blob();
  }
  return { uri, name: 'posture-frame.jpg', type: 'image/jpeg' };
}

export async function analyzePosture(
  imageUri: string,
  viewMode: ViewMode,
  baseline?: Record<string, number>,
): Promise<AnalysisResponse> {
  const form = new FormData();
  const part = await imagePart(imageUri);
  if (Platform.OS === 'web') form.append('image', part as Blob, 'posture-frame.jpg');
  else form.append('image', part as unknown as Blob);
  form.append('view_mode', viewMode);
  if (baseline) form.append('baseline', JSON.stringify(baseline));
  return request<AnalysisResponse>('/api/v1/posture/analyze', {
    method: 'POST',
    body: form,
  });
}

export async function createSession(payload: {
  profile_id: string;
  view_mode: ViewMode;
  intervention_stage: InterventionStage;
  baseline: Record<string, number>;
}): Promise<{ id: string; started_at: string }> {
  return request('/api/v1/sessions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
}

export async function addSessionSample(sessionId: string, sample: SessionSample): Promise<void> {
  await request(`/api/v1/sessions/${sessionId}/samples`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(sample),
  });
}

export async function completeSession(sessionId: string): Promise<SessionCompleteResponse> {
  return request(`/api/v1/sessions/${sessionId}/complete`, { method: 'POST' });
}

export async function getSessions(profileId: string): Promise<SessionSummary[]> {
  const result = await request<{ items: SessionSummary[] }>(
    `/api/v1/sessions?profile_id=${encodeURIComponent(profileId)}&limit=30`,
  );
  return result.items;
}

export async function deleteProfileData(profileId: string): Promise<number> {
  const result = await request<{ deleted_sessions: number }>(
    `/api/v1/profiles/${encodeURIComponent(profileId)}/data`,
    { method: 'DELETE' },
  );
  return result.deleted_sessions;
}
