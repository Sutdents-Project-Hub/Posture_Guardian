import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, PropsWithChildren, useContext, useEffect, useMemo, useState } from 'react';

import type { InterventionStage } from '@/types/posture';

const PROFILE_KEY = 'posture-guardian/profile-id';
const STAGE_KEY = 'posture-guardian/intervention-stage';
const HAPTICS_KEY = 'posture-guardian/haptics';

type AppContextValue = {
  ready: boolean;
  profileId: string;
  interventionStage: InterventionStage;
  hapticsEnabled: boolean;
  setInterventionStage: (value: InterventionStage) => Promise<void>;
  setHapticsEnabled: (value: boolean) => Promise<void>;
};

const AppContext = createContext<AppContextValue | null>(null);

function createProfileId(): string {
  const random = Math.random().toString(36).slice(2, 12);
  return `local-${Date.now().toString(36)}-${random}`;
}

function isStage(value: string | null): value is InterventionStage {
  return value === 'starter' || value === 'advanced' || value === 'intensive';
}

export function AppProvider({ children }: PropsWithChildren) {
  const [ready, setReady] = useState(false);
  const [profileId, setProfileId] = useState('local-loading');
  const [interventionStage, setStageState] = useState<InterventionStage>('starter');
  const [hapticsEnabled, setHapticsState] = useState(true);

  useEffect(() => {
    let active = true;
    async function load() {
      const [[, storedProfile], [, storedStage], [, storedHaptics]] = await AsyncStorage.multiGet([
        PROFILE_KEY,
        STAGE_KEY,
        HAPTICS_KEY,
      ]);
      const nextProfile = storedProfile || createProfileId();
      if (!storedProfile) await AsyncStorage.setItem(PROFILE_KEY, nextProfile);
      if (!active) return;
      setProfileId(nextProfile);
      if (isStage(storedStage)) setStageState(storedStage);
      if (storedHaptics !== null) setHapticsState(storedHaptics !== 'false');
      setReady(true);
    }
    load().catch(() => setReady(true));
    return () => {
      active = false;
    };
  }, []);

  const value = useMemo<AppContextValue>(
    () => ({
      ready,
      profileId,
      interventionStage,
      hapticsEnabled,
      setInterventionStage: async (next) => {
        setStageState(next);
        await AsyncStorage.setItem(STAGE_KEY, next);
      },
      setHapticsEnabled: async (next) => {
        setHapticsState(next);
        await AsyncStorage.setItem(HAPTICS_KEY, String(next));
      },
    }),
    [hapticsEnabled, interventionStage, profileId, ready],
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useAppContext(): AppContextValue {
  const value = useContext(AppContext);
  if (!value) throw new Error('useAppContext must be used inside AppProvider');
  return value;
}
