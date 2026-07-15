import { useMemo } from 'react';
import { useAppContext } from '@/context/app-context';
import type { ThemePalette } from '@/constants/design';

export function useAppTheme() {
  const { gradients, palette, resolvedTheme, setThemePreference, themePreference } = useAppContext();
  return { gradients, palette, resolvedTheme, setThemePreference, themePreference };
}

export function useThemedStyles<T>(factory: (palette: ThemePalette) => T): T {
  const { palette } = useAppTheme();
  return useMemo(() => factory(palette), [factory, palette]);
}
