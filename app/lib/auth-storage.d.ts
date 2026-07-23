export function readAuthToken(): Promise<string | null>;
export function saveAuthToken(token: string): Promise<void>;
export function clearAuthToken(): Promise<void>;
