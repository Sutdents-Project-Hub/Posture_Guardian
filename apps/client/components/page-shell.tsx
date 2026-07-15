import { PropsWithChildren, ReactNode } from 'react';
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
import { Palette, Spacing, Typography } from '@/constants/design';

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
  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.content, contentStyle]}
        refreshControl={
          onRefresh ? <RefreshControl refreshing={refreshing} onRefresh={onRefresh} /> : undefined
        }>
        {(title || eyebrow) && (
          <View style={styles.header}>
            <View style={styles.brandRow}>
              <BrandMark />
              <View style={styles.headingCopy}>
                {eyebrow ? <Text style={styles.eyebrow}>{eyebrow}</Text> : null}
                {title ? <Text style={styles.title}>{title}</Text> : null}
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

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Palette.canvas },
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
    color: Palette.primary,
    fontSize: Typography.caption,
    fontWeight: '800',
    letterSpacing: 1.2,
  },
  title: {
    fontFamily: Typography.family,
    color: Palette.ink,
    fontSize: Typography.h2,
    lineHeight: 29,
    fontWeight: '800',
  },
});
