import { Platform } from 'react-native';

import type {
  AnalysisResponse,
  HealthResponse,
  InterventionStage,
  ReminderFit,
  SessionCompleteResponse,
  SessionSample,
  SessionFeeling,
  SessionSummary,
  ViewMode,
} from '@/types/posture';

const configuredUrl = process.env.EXPO_PUBLIC_API_BASE_URL?.trim();
export const API_BASE_URL = (configuredUrl || 'http://localhost:8000').replace(/\/$/, '');
let accessToken: string | null = null;

export type AuthUser = {
  id: string;
  email: string;
};

type AuthSessionResponse = {
  access_token: string;
  token_type: 'bearer';
  expires_at: string;
  user: AuthUser;
};

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status?: number,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export function setAccessToken(token: string | null): void {
  accessToken = token;
}

async function request<T>(path: string, init?: RequestInit, timeoutMs = 8000): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(`${API_BASE_URL}${path}`, {
      ...init,
      signal: controller.signal,
      headers: {
        Accept: 'application/json',
        ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
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
  } catch (error) {
    if (error instanceof ApiError) throw error;
    if (error instanceof Error && error.name === 'AbortError') {
      throw new ApiError('連線逾時，已切換到可用的本地流程。');
    }
    throw new ApiError('目前無法連線到姿勢分析服務。');
  } finally {
    clearTimeout(timer);
  }
}

export async function getHealth(): Promise<HealthResponse> {
  return request<HealthResponse>('/health');
}

export async function registerAccount(email: string, password: string): Promise<AuthSessionResponse> {
  return request<AuthSessionResponse>('/api/v1/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
}

export async function loginAccount(email: string, password: string): Promise<AuthSessionResponse> {
  return request<AuthSessionResponse>('/api/v1/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
}

export async function getCurrentAccount(): Promise<AuthUser> {
  return request<AuthUser>('/api/v1/auth/me');
}

export async function logoutAccount(): Promise<void> {
  await request<undefined>('/api/v1/auth/logout', { method: 'POST' });
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
  return request(`/api/v1/sessions/${sessionId}/complete`, { method: 'POST' }, 12_000);
}

export async function submitSessionFeedback(
  sessionId: string,
  payload: { reminder_fit: ReminderFit; feeling: SessionFeeling | null },
): Promise<void> {
  await request(`/api/v1/sessions/${sessionId}/feedback`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
}

export async function getSessions(): Promise<SessionSummary[]> {
  const result = await request<{ items: SessionSummary[] }>('/api/v1/sessions?limit=30');
  return result.items;
}

export async function deleteAccountData(): Promise<number> {
  const result = await request<{ deleted_sessions: number }>('/api/v1/account/data', { method: 'DELETE' });
  return result.deleted_sessions;
}
