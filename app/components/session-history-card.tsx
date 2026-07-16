import { MaterialIcons } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';

import { Surface } from '@/components/ui/surface';
import { Radius, Spacing, Typography, type ThemePalette } from '@/constants/design';
import { useAppTheme, useThemedStyles } from '@/hooks/use-app-theme';
import { formatDate, formatDuration, VIEW_LABELS } from '@/lib/format';
import type { SessionSummary } from '@/types/posture';

export function SessionHistoryCard({ session }: { session: SessionSummary }) {
  const { palette } = useAppTheme();
  const styles = useThemedStyles(createStyles);
  const rateColor = session.good_posture_rate >= 75 ? palette.success : palette.warning;
  return (
    <Surface style={styles.card}>
      <View style={styles.topRow}>
        <View style={styles.iconFrame}>
          <MaterialIcons name="accessibility-new" size={23} color={palette.primary} />
        </View>
        <View style={styles.titleBlock}>
          <Text style={styles.title}>{VIEW_LABELS[session.view_mode]}</Text>
          <Text style={styles.date}>{formatDate(session.started_at)}</Text>
        </View>
        <Text style={[styles.rate, { color: rateColor }]}>{Math.round(session.good_posture_rate)}%</Text>
      </View>
      <View style={styles.track}>
        <View
          style={[
            styles.trackFill,
            { width: `${Math.max(3, session.good_posture_rate)}%`, backgroundColor: rateColor },
          ]}
        />
      </View>
      <View style={styles.metrics}>
        <Text style={styles.metric}>有效 {formatDuration(session.valid_seconds)}</Text>
        <Text style={styles.metric}>提醒 {session.posture_event_count} 次</Text>
        <Text style={styles.metric}>均分 {Math.round(session.average_score)}</Text>
      </View>
      {session.insight_text ? <Text style={styles.insight}>{session.insight_text}</Text> : null}
    </Surface>
  );
}

const createStyles = (palette: ThemePalette) => StyleSheet.create({
  card: { gap: Spacing.md, padding: Spacing.md },
  topRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  iconFrame: {
    width: 44,
    height: 44,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: palette.primaryPale,
    borderWidth: 1,
    borderColor: palette.primaryDark,
  },
  titleBlock: { flex: 1 },
  title: { fontFamily: Typography.displayFamily, fontSize: Typography.body, fontWeight: '700', color: palette.ink },
  date: { fontFamily: Typography.family, fontSize: Typography.caption, color: palette.inkSoft, marginTop: 2 },
  rate: { fontFamily: Typography.displayFamily, fontSize: Typography.h2, fontWeight: '700' },
  track: { height: 7, borderRadius: Radius.pill, overflow: 'hidden', backgroundColor: palette.surfaceMuted },
  trackFill: { height: '100%', borderRadius: Radius.pill },
  metrics: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.md },
  metric: { fontFamily: Typography.family, fontSize: Typography.caption, fontWeight: '700', color: palette.inkSoft },
  insight: { fontFamily: Typography.family, fontSize: Typography.small, lineHeight: 21, color: palette.ink },
});
