import { MaterialIcons } from '@expo/vector-icons';
import { Alert, StyleSheet, Switch, Text, View } from 'react-native';

import { PageShell } from '@/components/page-shell';
import { StatusPill } from '@/components/status-pill';
import { AppButton } from '@/components/ui/app-button';
import { Surface } from '@/components/ui/surface';
import { useAppContext } from '@/context/app-context';
import { Palette, Radius, Spacing, Typography } from '@/constants/design';
import { API_BASE_URL, deleteProfileData } from '@/lib/api';
import { STAGE_LABELS } from '@/lib/format';
import type { InterventionStage } from '@/types/posture';

const STAGES: { value: InterventionStage; title: string; description: string }[] = [
  { value: 'starter', title: '初期提醒', description: '溫和視覺提示，冷卻 60 秒。' },
  { value: 'advanced', title: '進階提醒', description: '視覺搭配震動，冷卻 45 秒。' },
  { value: 'intensive', title: '加強介入', description: '加強震動並建議休息 5 分鐘，冷卻 30 秒。' },
];

export default function SettingsScreen() {
  const {
    profileId,
    interventionStage,
    hapticsEnabled,
    setInterventionStage,
    setHapticsEnabled,
  } = useAppContext();

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
    <PageShell eyebrow="PREFERENCES & PRIVACY" title="提醒與隱私">
      <Surface tone="amber" style={styles.notice}>
        <MaterialIcons name="info-outline" size={25} color="#745018" />
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
                label={selected ? '已選擇' : '選擇'}
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
          <MaterialIcons name="vibration" size={24} color={Palette.primary} />
        </View>
        <View style={styles.settingCopy}>
          <Text style={styles.settingTitle}>手機震動提醒</Text>
          <Text style={styles.settingText}>Web 不支援時只顯示視覺提示；不會使用令人疼痛的硬體按壓。</Text>
        </View>
        <Switch
          accessibilityLabel="手機震動提醒"
          value={hapticsEnabled}
          onValueChange={(value) => void setHapticsEnabled(value)}
          trackColor={{ false: Palette.line, true: Palette.primaryPale }}
          thumbColor={hapticsEnabled ? Palette.primary : Palette.inkSoft}
        />
      </Surface>

      <Text style={styles.sectionTitle}>資料與連線</Text>
      <Surface style={styles.dataCard}>
        <View style={styles.dataRow}>
          <MaterialIcons name="cloud-done" size={22} color={Palette.primary} />
          <View style={styles.dataCopy}>
            <Text style={styles.dataLabel}>API 位置</Text>
            <Text selectable style={styles.mono}>{API_BASE_URL}</Text>
          </View>
        </View>
        <View style={styles.divider} />
        <View style={styles.dataRow}>
          <MaterialIcons name="fingerprint" size={22} color={Palette.primary} />
          <View style={styles.dataCopy}>
            <Text style={styles.dataLabel}>匿名本機識別碼</Text>
            <Text selectable numberOfLines={1} style={styles.mono}>{profileId}</Text>
          </View>
        </View>
        <View style={styles.divider} />
        <View style={styles.dataRow}>
          <MaterialIcons name="no-photography" size={22} color={Palette.primary} />
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

const styles = StyleSheet.create({
  notice: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.sm },
  noticeCopy: { flex: 1, gap: 4 },
  noticeTitle: { fontFamily: Typography.family, color: '#745018', fontSize: Typography.small, fontWeight: '900' },
  noticeText: { fontFamily: Typography.family, color: '#745018', fontSize: Typography.caption, lineHeight: 19 },
  sectionHeading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: Spacing.md },
  sectionTitle: { fontFamily: Typography.family, color: Palette.ink, fontSize: Typography.h3, fontWeight: '900' },
  stageList: { gap: Spacing.sm },
  stage: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, padding: Spacing.md },
  stageSelected: { borderColor: Palette.primary, borderWidth: 2, backgroundColor: '#FBFFFD' },
  radio: { width: 24, height: 24, borderRadius: 12, borderWidth: 2, borderColor: Palette.line, alignItems: 'center', justifyContent: 'center' },
  radioSelected: { borderColor: Palette.primary },
  radioDot: { width: 12, height: 12, borderRadius: 6, backgroundColor: Palette.primary },
  stageCopy: { flex: 1 },
  stageTitle: { fontFamily: Typography.family, color: Palette.ink, fontSize: Typography.body, fontWeight: '900' },
  stageText: { fontFamily: Typography.family, color: Palette.inkSoft, fontSize: Typography.caption, lineHeight: 19, marginTop: 3 },
  settingRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  settingIcon: { width: 48, height: 48, borderRadius: Radius.md, alignItems: 'center', justifyContent: 'center', backgroundColor: Palette.primaryPale },
  settingCopy: { flex: 1 },
  settingTitle: { fontFamily: Typography.family, color: Palette.ink, fontSize: Typography.body, fontWeight: '800' },
  settingText: { fontFamily: Typography.family, color: Palette.inkSoft, fontSize: Typography.caption, lineHeight: 19, marginTop: 3 },
  dataCard: { gap: Spacing.md },
  dataRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  dataCopy: { flex: 1, minWidth: 0 },
  dataLabel: { fontFamily: Typography.family, color: Palette.inkSoft, fontSize: Typography.caption, fontWeight: '700' },
  dataValue: { fontFamily: Typography.family, color: Palette.ink, fontSize: Typography.small, fontWeight: '700', marginTop: 2 },
  mono: { fontFamily: 'monospace', color: Palette.ink, fontSize: Typography.caption, marginTop: 3 },
  divider: { height: 1, backgroundColor: Palette.line },
  dangerZone: { gap: Spacing.md },
  dangerCopy: { flex: 1 },
  dangerTitle: { fontFamily: Typography.family, color: '#8C331F', fontSize: Typography.body, fontWeight: '900' },
  dangerText: { fontFamily: Typography.family, color: '#8C331F', fontSize: Typography.caption, lineHeight: 19, marginTop: 3 },
});
