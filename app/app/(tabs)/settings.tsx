import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { Alert, Pressable, StyleSheet, Switch, Text, View } from 'react-native';

import { PageShell } from '@/components/page-shell';
import { StatusPill } from '@/components/status-pill';
import { AppButton } from '@/components/ui/app-button';
import { Surface } from '@/components/ui/surface';
import { useAppContext, type ThemePreference } from '@/context/app-context';
import { Radius, Spacing, Typography, type ThemePalette } from '@/constants/design';
import { useThemedStyles } from '@/hooks/use-app-theme';
import { API_BASE_URL, deleteProfileData } from '@/lib/api';
import { STAGE_LABELS } from '@/lib/format';
import type { InterventionStage } from '@/types/posture';

const STAGES: { value: InterventionStage; title: string; description: string }[] = [
  { value: 'starter', title: '初期提醒', description: '溫和視覺提示，冷卻 60 秒。' },
  { value: 'advanced', title: '進階提醒', description: '視覺搭配震動，冷卻 45 秒。' },
  { value: 'intensive', title: '加強介入', description: '加強震動並建議休息 5 分鐘，冷卻 30 秒。' },
];

const THEME_OPTIONS: {
  value: ThemePreference;
  title: string;
  description: string;
  icon: keyof typeof MaterialIcons.glyphMap;
}[] = [
  { value: 'system', title: '跟隨系統', description: '自動配合裝置', icon: 'settings-brightness' },
  { value: 'light', title: '淺色', description: '暖象牙與陶土橘', icon: 'light-mode' },
  { value: 'dark', title: '深色', description: '炭墨與暖陶色', icon: 'dark-mode' },
];

export default function SettingsScreen() {
  const {
    profileId,
    interventionStage,
    hapticsEnabled,
    palette,
    resolvedTheme,
    themePreference,
    setInterventionStage,
    setHapticsEnabled,
    setThemePreference,
  } = useAppContext();
  const styles = useThemedStyles(createStyles);

  function confirmDelete() {
    Alert.alert('刪除全部姿勢紀錄？', '這會刪除工作階段、角度與摘要，且無法復原。', [
      { text: '取消', style: 'cancel' },
      {
        text: '確認刪除',
        style: 'destructive',
        onPress: () => {
          void deleteProfileData(profileId)
            .then((count) => Alert.alert('已刪除', `共刪除 ${count} 個工作階段。`))
            .catch(() => Alert.alert('目前無法刪除', '請確認 API 已啟動後再試一次。'));
        },
      },
    ]);
  }

  return (
    <PageShell eyebrow="PREFERENCES & PRIVACY" title="提醒與隱私" contentStyle={styles.pageContent}>
      <View style={styles.sectionHeading}>
        <Text style={styles.sectionTitle}>外觀模式</Text>
        <StatusPill label={resolvedTheme === 'dark' ? '目前：深色' : '目前：淺色'} tone="info" />
      </View>
      <Surface style={styles.themeCard}>
        <Text style={styles.themeLead}>兩種模式都使用暖紙色、陶土橘與墨藍的編輯式配色，選擇會儲存在這台裝置。</Text>
        <View accessibilityRole="radiogroup" style={styles.themeOptions}>
          {THEME_OPTIONS.map((option) => {
            const selected = option.value === themePreference;
            return (
              <Pressable
                key={option.value}
                accessibilityRole="radio"
                accessibilityLabel={option.title}
                accessibilityState={{ checked: selected }}
                aria-checked={selected}
                onPress={() => void setThemePreference(option.value)}
                style={({ pressed }) => [
                  styles.themeOption,
                  selected && styles.themeOptionSelected,
                  pressed && styles.themeOptionPressed,
                ]}>
                <View style={[styles.themeIcon, selected && styles.themeIconSelected]}>
                  <MaterialIcons
                    name={option.icon}
                    size={22}
                    color={selected ? palette.primaryDark : palette.inkSoft}
                  />
                </View>
                <View style={styles.themeCopy}>
                  <Text style={[styles.themeTitle, selected && styles.themeTitleSelected]}>{option.title}</Text>
                  <Text style={styles.themeDescription}>{option.description}</Text>
                </View>
                <View style={[styles.smallRadio, selected && styles.smallRadioSelected]}>
                  {selected ? <View style={styles.smallRadioDot} /> : null}
                </View>
              </Pressable>
            );
          })}
        </View>
      </Surface>

      <Surface tone="amber" style={styles.notice}>
        <MaterialIcons name="info-outline" size={25} color={palette.warning} />
        <View style={styles.noticeCopy}>
          <Text style={styles.noticeTitle}>階段代表提醒策略，不代表醫療嚴重程度</Text>
          <Text style={styles.noticeText}>系統有足夠的 6 次資料後才會提出自動調整建議，你仍可隨時覆寫。</Text>
        </View>
      </Surface>

      <View style={styles.sectionHeading}>
        <Text style={styles.sectionTitle}>提醒強度</Text>
        <StatusPill label={STAGE_LABELS[interventionStage]} tone="info" />
      </View>
      <View style={styles.stageList}>
        {STAGES.map((stage) => {
          const selected = stage.value === interventionStage;
          return (
            <Surface key={stage.value} style={[styles.stage, selected && styles.stageSelected]}>
              <View style={[styles.radio, selected && styles.radioSelected]}>
                {selected ? <View style={styles.radioDot} /> : null}
              </View>
              <View style={styles.stageCopy}>
                <Text style={styles.stageTitle}>{stage.title}</Text>
                <Text style={styles.stageText}>{stage.description}</Text>
              </View>
              <AppButton
                label={selected ? `已選擇${stage.title}` : `選擇${stage.title}`}
                variant={selected ? 'ghost' : 'secondary'}
                disabled={selected}
                onPress={() => void setInterventionStage(stage.value)}
              />
            </Surface>
          );
        })}
      </View>

      <Text style={styles.sectionTitle}>回饋方式</Text>
      <Surface style={styles.settingRow}>
        <View style={styles.settingIcon}>
          <MaterialIcons name="vibration" size={24} color={palette.primary} />
        </View>
        <View style={styles.settingCopy}>
          <Text style={styles.settingTitle}>手機震動提醒</Text>
          <Text style={styles.settingText}>Web 不支援時只顯示視覺提示；不會使用令人疼痛的硬體按壓。</Text>
        </View>
        <Switch
          accessibilityLabel="手機震動提醒"
          value={hapticsEnabled}
          onValueChange={(value) => void setHapticsEnabled(value)}
          trackColor={{ false: palette.line, true: palette.primaryPale }}
          thumbColor={hapticsEnabled ? palette.primary : palette.inkSoft}
        />
      </Surface>

      <Text style={styles.sectionTitle}>資料與連線</Text>
      <Surface style={styles.dataCard}>
        <View style={styles.dataRow}>
          <MaterialIcons name="cloud-done" size={22} color={palette.primary} />
          <View style={styles.dataCopy}>
            <Text style={styles.dataLabel}>API 位置</Text>
            <Text selectable style={styles.mono}>{API_BASE_URL}</Text>
          </View>
        </View>
        <View style={styles.divider} />
        <View style={styles.dataRow}>
          <MaterialIcons name="fingerprint" size={22} color={palette.primary} />
          <View style={styles.dataCopy}>
            <Text style={styles.dataLabel}>匿名本機識別碼</Text>
            <Text selectable numberOfLines={1} style={styles.mono}>{profileId}</Text>
          </View>
        </View>
        <View style={styles.divider} />
        <View style={styles.dataRow}>
          <MaterialIcons name="no-photography" size={22} color={palette.primary} />
          <View style={styles.dataCopy}>
            <Text style={styles.dataLabel}>影像保存</Text>
            <Text style={styles.dataValue}>關閉（固定政策）</Text>
          </View>
        </View>
      </Surface>

      <Surface tone="danger" style={styles.dangerZone}>
        <View style={styles.dangerCopy}>
          <Text style={styles.dangerTitle}>刪除全部紀錄</Text>
          <Text style={styles.dangerText}>只會刪除這個匿名識別碼底下的衍生指標與摘要。</Text>
        </View>
        <AppButton label="刪除資料" icon="delete-outline" variant="danger" onPress={confirmDelete} />
      </Surface>
    </PageShell>
  );
}

const createStyles = (palette: ThemePalette) => StyleSheet.create({
  pageContent: { maxWidth: 860 },
  themeCard: { gap: Spacing.md },
  themeLead: { fontFamily: Typography.family, color: palette.inkSoft, fontSize: Typography.small, lineHeight: 21 },
  themeOptions: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  themeOption: {
    minHeight: 74,
    minWidth: 190,
    flexGrow: 1,
    flexBasis: 190,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    padding: Spacing.sm,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: palette.line,
    backgroundColor: palette.canvasRaised,
  },
  themeOptionSelected: { borderColor: palette.primary, backgroundColor: palette.primaryPale },
  themeOptionPressed: { opacity: 0.76 },
  themeIcon: { width: 42, height: 42, borderRadius: Radius.sm, alignItems: 'center', justifyContent: 'center', backgroundColor: palette.surfaceMuted, borderWidth: 1, borderColor: palette.line },
  themeIconSelected: { backgroundColor: palette.surface },
  themeCopy: { flex: 1 },
  themeTitle: { fontFamily: Typography.family, color: palette.ink, fontSize: Typography.small, fontWeight: '900' },
  themeTitleSelected: { color: palette.primaryDark },
  themeDescription: { fontFamily: Typography.family, color: palette.inkSoft, fontSize: Typography.caption, marginTop: 3 },
  smallRadio: { width: 20, height: 20, borderRadius: 10, borderWidth: 1.5, borderColor: palette.lineBright, alignItems: 'center', justifyContent: 'center' },
  smallRadioSelected: { borderColor: palette.primary },
  smallRadioDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: palette.primary },
  notice: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.sm },
  noticeCopy: { flex: 1, gap: 4 },
  noticeTitle: { fontFamily: Typography.family, color: palette.warningText, fontSize: Typography.small, fontWeight: '900' },
  noticeText: { fontFamily: Typography.family, color: palette.warningTextSoft, fontSize: Typography.caption, lineHeight: 19 },
  sectionHeading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: Spacing.md },
  sectionTitle: { fontFamily: Typography.displayFamily, color: palette.ink, fontSize: Typography.h3, fontWeight: '700' },
  stageList: { gap: Spacing.sm },
  stage: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, padding: Spacing.md },
  stageSelected: { borderColor: palette.primary, borderWidth: 2, backgroundColor: palette.primaryPale },
  radio: { width: 24, height: 24, borderRadius: 12, borderWidth: 2, borderColor: palette.line, alignItems: 'center', justifyContent: 'center' },
  radioSelected: { borderColor: palette.primary },
  radioDot: { width: 12, height: 12, borderRadius: 6, backgroundColor: palette.primary },
  stageCopy: { flex: 1 },
  stageTitle: { fontFamily: Typography.family, color: palette.ink, fontSize: Typography.body, fontWeight: '900' },
  stageText: { fontFamily: Typography.family, color: palette.inkSoft, fontSize: Typography.caption, lineHeight: 19, marginTop: 3 },
  settingRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  settingIcon: { width: 48, height: 48, borderRadius: Radius.sm, alignItems: 'center', justifyContent: 'center', backgroundColor: palette.primaryPale, borderWidth: 1, borderColor: palette.primaryDark },
  settingCopy: { flex: 1 },
  settingTitle: { fontFamily: Typography.family, color: palette.ink, fontSize: Typography.body, fontWeight: '800' },
  settingText: { fontFamily: Typography.family, color: palette.inkSoft, fontSize: Typography.caption, lineHeight: 19, marginTop: 3 },
  dataCard: { gap: Spacing.md },
  dataRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  dataCopy: { flex: 1, minWidth: 0 },
  dataLabel: { fontFamily: Typography.family, color: palette.inkSoft, fontSize: Typography.caption, fontWeight: '700' },
  dataValue: { fontFamily: Typography.family, color: palette.ink, fontSize: Typography.small, fontWeight: '700', marginTop: 2 },
  mono: { fontFamily: 'monospace', color: palette.ink, fontSize: Typography.caption, marginTop: 3 },
  divider: { height: 1, backgroundColor: palette.line },
  dangerZone: { gap: Spacing.md },
  dangerCopy: { flex: 1 },
  dangerTitle: { fontFamily: Typography.family, color: palette.dangerText, fontSize: Typography.body, fontWeight: '900' },
  dangerText: { fontFamily: Typography.family, color: palette.dangerTextSoft, fontSize: Typography.caption, lineHeight: 19, marginTop: 3 },
});
