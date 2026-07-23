import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, PropsWithChildren, useContext, useEffect, useMemo, useState } from 'react';
import { useColorScheme } from 'react-native';

import {
  DarkGradients,
  DarkPalette,
  LightGradients,
  LightPalette,
  type ThemeGradients,
  type ThemePalette,
} from '@/constants/design';
import type { InterventionStage } from '@/types/posture';
import {
  type AuthUser,
  getCurrentAccount,
  loginAccount,
  logoutAccount,
  registerAccount,
  setAccessToken,
} from '@/lib/api';
import { clearAuthToken, readAuthToken, saveAuthToken } from '@/lib/auth-storage';

const STAGE_KEY = 'posture-guardian/intervention-stage';
const HAPTICS_KEY = 'posture-guardian/haptics';
const THEME_KEY = 'posture-guardian/theme';

export type ThemePreference = 'system' | 'light' | 'dark';
export type ResolvedTheme = Exclude<ThemePreference, 'system'>;

type AppContextValue = {
  ready: boolean;
  account: AuthUser | null;
  interventionStage: InterventionStage;
  hapticsEnabled: boolean;
  themePreference: ThemePreference;
  resolvedTheme: ResolvedTheme;
  palette: ThemePalette;
  gradients: ThemeGradients;
  setInterventionStage: (value: InterventionStage) => Promise<void>;
  setHapticsEnabled: (value: boolean) => Promise<void>;
  setThemePreference: (value: ThemePreference) => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
};

const AppContext = createContext<AppContextValue | null>(null);

function isStage(value: string | null): value is InterventionStage {
  return value === 'starter' || value === 'advanced' || value === 'intensive';
}

function isThemePreference(value: string | null): value is ThemePreference {
  return value === 'system' || value === 'light' || value === 'dark';
}

export function AppProvider({ children }: PropsWithChildren) {
  const systemTheme = useColorScheme();
  const [ready, setReady] = useState(false);
  const [account, setAccount] = useState<AuthUser | null>(null);
  const [interventionStage, setStageState] = useState<InterventionStage>('starter');
  const [hapticsEnabled, setHapticsState] = useState(true);
  const [themePreference, setThemePreferenceState] = useState<ThemePreference>('system');

  useEffect(() => {
    let active = true;
    async function load() {
      const [[, storedStage], [, storedHaptics], [, storedTheme]] = await AsyncStorage.multiGet([
        STAGE_KEY,
        HAPTICS_KEY,
        THEME_KEY,
      ]);
      const storedToken = await readAuthToken();
      if (storedToken) {
        setAccessToken(storedToken);
        try {
          const currentAccount = await getCurrentAccount();
          if (active) setAccount(currentAccount);
        } catch {
          setAccessToken(null);
          await clearAuthToken();
        }
      }
      if (!active) return;
      if (isStage(storedStage)) setStageState(storedStage);
      if (storedHaptics !== null) setHapticsState(storedHaptics !== 'false');
      if (isThemePreference(storedTheme)) setThemePreferenceState(storedTheme);
      setReady(true);
    }
    load().catch(() => setReady(true));
    return () => {
      active = false;
    };
  }, []);

  const resolvedTheme: ResolvedTheme =
    themePreference === 'system' ? (systemTheme === 'light' ? 'light' : 'dark') : themePreference;
  const palette = resolvedTheme === 'light' ? LightPalette : DarkPalette;
  const gradients = resolvedTheme === 'light' ? LightGradients : DarkGradients;

  const value = useMemo<AppContextValue>(
    () => ({
      ready,
      account,
      interventionStage,
      hapticsEnabled,
      themePreference,
      resolvedTheme,
      palette,
      gradients,
      setInterventionStage: async (next) => {
        setStageState(next);
        await AsyncStorage.setItem(STAGE_KEY, next);
      },
      setHapticsEnabled: async (next) => {
        setHapticsState(next);
        await AsyncStorage.setItem(HAPTICS_KEY, String(next));
      },
      setThemePreference: async (next) => {
        setThemePreferenceState(next);
        await AsyncStorage.setItem(THEME_KEY, next);
      },
      signIn: async (email, password) => {
        const result = await loginAccount(email, password);
        setAccessToken(result.access_token);
        await saveAuthToken(result.access_token);
        setAccount(result.user);
      },
      signUp: async (email, password) => {
        const result = await registerAccount(email, password);
        setAccessToken(result.access_token);
        await saveAuthToken(result.access_token);
        setAccount(result.user);
      },
      signOut: async () => {
        try {
          await logoutAccount();
        } finally {
          setAccessToken(null);
          await clearAuthToken();
          setAccount(null);
        }
      },
    }),
    [account, gradients, hapticsEnabled, interventionStage, palette, ready, resolvedTheme, themePreference],
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useAppContext(): AppContextValue {
  const value = useContext(AppContext);
  if (!value) throw new Error('useAppContext must be used inside AppProvider');
  return value;
}
