import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';

import { AppProvider } from '@/context/app-context';
import { useAppTheme } from '@/hooks/use-app-theme';

export const unstable_settings = {
  anchor: '(tabs)',
};

export default function RootLayout() {
  return (
    <AppProvider>
      <ThemedApp />
    </AppProvider>
  );
}

function ThemedApp() {
  const { palette, resolvedTheme } = useAppTheme();
  const baseTheme = resolvedTheme === 'dark' ? DarkTheme : DefaultTheme;
  const theme = {
    ...baseTheme,
    dark: resolvedTheme === 'dark',
    colors: {
      ...baseTheme.colors,
      background: palette.canvas,
      card: palette.surface,
      text: palette.ink,
      primary: palette.primary,
      border: palette.line,
    },
  };

  return (
    <ThemeProvider value={theme}>
      <Stack>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="auth" options={{ headerShown: false, animation: 'slide_from_right' }} />
        <Stack.Screen name="session" options={{ headerShown: false, animation: 'slide_from_right' }} />
      </Stack>
      <StatusBar style={resolvedTheme === 'dark' ? 'light' : 'dark'} />
    </ThemeProvider>
  );
}
