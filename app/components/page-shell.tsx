import { PropsWithChildren, ReactNode } from 'react';
import { LinearGradient } from 'expo-linear-gradient';
import {
  RefreshControl,
  ScrollView,
  StyleProp,
  StyleSheet,
  Text,
  View,
  ViewStyle,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BrandMark } from '@/components/brand-mark';
import { Spacing, Typography, type ThemePalette } from '@/constants/design';
import { useAppTheme, useThemedStyles } from '@/hooks/use-app-theme';

type Props = PropsWithChildren<{
  title?: string;
  eyebrow?: string;
  right?: ReactNode;
  refreshing?: boolean;
  onRefresh?: () => void;
  contentStyle?: StyleProp<ViewStyle>;
}>;

export function PageShell({
  children,
  title,
  eyebrow,
  right,
  refreshing = false,
  onRefresh,
  contentStyle,
}: Props) {
  const { gradients, palette } = useAppTheme();
  const styles = useThemedStyles(createStyles);
  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <LinearGradient
        colors={gradients.ambient}
        locations={[0, 0.46, 1]}
        start={{ x: 0.08, y: 0 }}
        end={{ x: 0.92, y: 0.82 }}
        style={styles.ambient}
      />
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.content, contentStyle]}
        refreshControl={
          onRefresh ? (
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={palette.accent}
              colors={[palette.primary]}
            />
          ) : undefined
        }>
        {(title || eyebrow) && (
          <View style={styles.header}>
            <View style={styles.brandRow}>
              <BrandMark />
              <View style={styles.headingCopy}>
                {eyebrow ? <Text style={styles.eyebrow}>{eyebrow}</Text> : null}
                {title ? <Text accessibilityRole="header" style={styles.title}>{title}</Text> : null}
              </View>
            </View>
            {right}
          </View>
        )}
        {children}
      </ScrollView>
    </SafeAreaView>
  );
}

const createStyles = (palette: ThemePalette) => StyleSheet.create({
  safe: { flex: 1, backgroundColor: palette.canvas },
  ambient: { ...StyleSheet.absoluteFillObject, pointerEvents: 'none' },
  scroll: { flex: 1 },
  content: {
    width: '100%',
    maxWidth: 1180,
    alignSelf: 'center',
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.sm,
    paddingBottom: 120,
    gap: Spacing.lg,
  },
  header: {
    minHeight: 62,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: Spacing.md,
  },
  brandRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, flexShrink: 1 },
  headingCopy: { flexShrink: 1 },
  eyebrow: {
    fontFamily: Typography.family,
    color: palette.accent,
    fontSize: Typography.caption,
    fontWeight: '800',
    letterSpacing: 1.2,
  },
  title: {
    fontFamily: Typography.family,
    color: palette.ink,
    fontSize: Typography.h2,
    lineHeight: 29,
    fontWeight: '800',
  },
});
