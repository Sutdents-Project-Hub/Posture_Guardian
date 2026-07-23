import { Redirect } from 'expo-router';
import { PropsWithChildren } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { useAppContext } from '@/context/app-context';
import { useAppTheme } from '@/hooks/use-app-theme';

function AuthBootstrap() {
  const { palette } = useAppTheme();

  return (
    <View accessibilityRole="progressbar" accessibilityLabel="正在確認登入狀態" style={styles.container}>
      <ActivityIndicator color={palette.primary} size="large" />
    </View>
  );
}

export function RequireAuthenticated({ children }: PropsWithChildren) {
  const { account, ready } = useAppContext();

  if (!ready) return <AuthBootstrap />;
  if (!account) return <Redirect href="/auth" />;

  return children;
}

export function RequireSignedOut({ children }: PropsWithChildren) {
  const { account, ready } = useAppContext();

  if (!ready) return <AuthBootstrap />;
  if (account) return <Redirect href="/(tabs)" />;

  return children;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
