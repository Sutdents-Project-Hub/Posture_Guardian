const TOKEN_KEY = 'posture-guardian/auth-token';

function storage(): Storage | null {
  return typeof window === 'undefined' ? null : window.sessionStorage;
}

export async function readAuthToken(): Promise<string | null> {
  return storage()?.getItem(TOKEN_KEY) ?? null;
}

export async function saveAuthToken(token: string): Promise<void> {
  storage()?.setItem(TOKEN_KEY, token);
}

export async function clearAuthToken(): Promise<void> {
  storage()?.removeItem(TOKEN_KEY);
}
