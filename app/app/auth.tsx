import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { router } from 'expo-router';
import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BrandMark } from '@/components/brand-mark';
import { AuthForm } from '@/components/auth-form';
import { RequireSignedOut } from '@/components/auth-guard';
import { StatusPill } from '@/components/status-pill';
import { AppButton } from '@/components/ui/app-button';
import { Surface } from '@/components/ui/surface';
import { useAppContext } from '@/context/app-context';
import { Radius, Spacing, Typography, type ThemePalette } from '@/constants/design';
import { useAppTheme, useThemedStyles } from '@/hooks/use-app-theme';
import { ApiError } from '@/lib/api';

type Mode = 'login' | 'register';

export default function AuthRoute() {
  return (
    <RequireSignedOut>
      <AuthScreen />
    </RequireSignedOut>
  );
}

function AuthScreen() {
  const { palette } = useAppTheme();
  const styles = useThemedStyles(createStyles);
  const { signIn, signUp } = useAppContext();
  const [mode, setMode] = useState<Mode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isRegistering = mode === 'register';

  async function submit() {
    const normalizedEmail = email.trim();
    if (!normalizedEmail || !password) {
      setError('請輸入 Email 與密碼。');
      return;
    }
    if (isRegistering && password.length < 12) {
      setError('密碼至少需要 12 個字元。');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      if (isRegistering) await signUp(normalizedEmail, password);
      else await signIn(normalizedEmail, password);
      router.replace('/(tabs)');
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : '目前無法完成帳號驗證，請稍後再試。');
    } finally {
      setSubmitting(false);
    }
  }

  function changeMode(next: Mode) {
    setMode(next);
    setError(null);
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right', 'bottom']}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.keyboard}
        contentContainerStyle={styles.keyboardContent}>
        <View style={styles.topBar}>
          <StatusPill label="帳號同步" tone="info" />
        </View>

        <View style={styles.content}>
          <View style={styles.brandRow}>
            <BrandMark />
            <Text style={styles.brandName}>姿勢守衛隊</Text>
          </View>
          <Text style={styles.eyebrow}>PRIVATE PROGRESS</Text>
          <Text accessibilityRole="header" style={styles.title}>
            {isRegistering ? '建立你的同步帳號' : '登入，接續你的姿勢趨勢'}
          </Text>
          <Text style={styles.lead}>
            {isRegistering
              ? '帳號只用於保護並同步你的衍生姿勢資料；相片與即時影像不會保存。'
              : '登入後才能存取自己的工作階段、趨勢與個人化提醒。'}
          </Text>

          <AuthForm onSubmit={() => void submit()}>
            <Surface style={styles.form}>
              <View style={styles.modeSwitch} accessibilityRole="tablist">
                <ModeButton label="登入" selected={!isRegistering} onPress={() => changeMode('login')} />
                <ModeButton label="註冊" selected={isRegistering} onPress={() => changeMode('register')} />
              </View>

              <View style={styles.fieldGroup}>
                <Text style={styles.label}>Email</Text>
                <TextInput
                  accessibilityLabel="Email"
                  autoCapitalize="none"
                  autoComplete="email"
                  autoCorrect={false}
                  keyboardType="email-address"
                  onChangeText={setEmail}
                  placeholder="you@example.com"
                  placeholderTextColor={palette.inkSoft}
                  style={styles.input}
                  textContentType="emailAddress"
                  value={email}
                />
              </View>

              <View style={styles.fieldGroup}>
                <View style={styles.passwordLabelRow}>
                  <Text style={styles.label}>密碼</Text>
                  {isRegistering ? <Text style={styles.hint}>至少 12 個字元</Text> : null}
                </View>
                <View style={styles.passwordInputWrap}>
                  <TextInput
                    accessibilityLabel="密碼"
                    autoCapitalize="none"
                    autoComplete={isRegistering ? 'new-password' : 'current-password'}
                    autoCorrect={false}
                    onChangeText={setPassword}
                    onSubmitEditing={Platform.OS === 'web' ? undefined : () => void submit()}
                    placeholder={isRegistering ? '建立至少 12 個字元的密碼' : '輸入你的密碼'}
                    placeholderTextColor={palette.inkSoft}
                    returnKeyType="done"
                    secureTextEntry={!showPassword}
                    style={styles.passwordInput}
                    textContentType={isRegistering ? 'newPassword' : 'password'}
                    value={password}
                  />
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={showPassword ? '隱藏密碼' : '顯示密碼'}
                    onPress={() => setShowPassword((visible) => !visible)}
                    style={({ pressed }) => [styles.visibilityButton, pressed && styles.pressed]}>
                    <MaterialIcons
                      name={showPassword ? 'visibility-off' : 'visibility'}
                      size={21}
                      color={palette.primary}
                    />
                  </Pressable>
                </View>
              </View>

              {error ? (
                <View accessibilityLiveRegion="polite" style={styles.errorBox}>
                  <MaterialIcons name="error-outline" size={20} color={palette.danger} />
                  <Text style={styles.errorText}>{error}</Text>
                </View>
              ) : null}

              <AppButton
                fullWidth
                icon={isRegistering ? 'person-add-alt-1' : 'login'}
                label={isRegistering ? '建立帳號並開始' : '登入帳號'}
                loading={submitting}
                onPress={() => void submit()}
              />
            </Surface>
          </AuthForm>

          <Surface tone="amber" style={styles.privacy}>
            <MaterialIcons name="lock-outline" size={24} color={palette.warning} />
            <View style={styles.privacyCopy}>
              <Text style={styles.privacyTitle}>隱私保護</Text>
              <Text style={styles.privacyText}>密碼只以安全雜湊保存；伺服器只保存姿勢角度、時間與摘要。</Text>
            </View>
          </Surface>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function ModeButton({ label, selected, onPress }: { label: string; selected: boolean; onPress: () => void }) {
  const styles = useThemedStyles(createStyles);
  return (
    <Pressable
      accessibilityRole="tab"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={({ pressed }) => [styles.modeButton, selected && styles.modeButtonSelected, pressed && styles.pressed]}>
      <Text style={[styles.modeButtonLabel, selected && styles.modeButtonLabelSelected]}>{label}</Text>
    </Pressable>
  );
}

const createStyles = (palette: ThemePalette) => StyleSheet.create({
  safe: { flex: 1, backgroundColor: palette.canvas },
  keyboard: { flex: 1 },
  keyboardContent: { flexGrow: 1 },
  topBar: {
    width: '100%',
    maxWidth: 600,
    alignSelf: 'center',
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.sm,
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  content: { width: '100%', maxWidth: 560, alignSelf: 'center', padding: Spacing.lg, paddingTop: Spacing.xl, gap: Spacing.md },
  brandRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  brandName: { fontFamily: Typography.displayFamily, color: palette.ink, fontSize: Typography.h3, fontWeight: '700' },
  eyebrow: { fontFamily: Typography.family, color: palette.accent, fontSize: Typography.caption, fontWeight: '800', letterSpacing: 1.5, marginTop: Spacing.md },
  title: { fontFamily: Typography.displayFamily, color: palette.ink, fontSize: Typography.h1, lineHeight: 39, fontWeight: '700' },
  lead: { fontFamily: Typography.family, color: palette.inkSoft, fontSize: Typography.body, lineHeight: 25 },
  form: { gap: Spacing.md },
  modeSwitch: { flexDirection: 'row', backgroundColor: palette.surfaceMuted, padding: 4, borderRadius: Radius.md, gap: 4 },
  modeButton: { flex: 1, minHeight: 42, alignItems: 'center', justifyContent: 'center', borderRadius: Radius.sm },
  modeButtonSelected: { backgroundColor: palette.surface, borderWidth: 1, borderColor: palette.primary },
  modeButtonLabel: { fontFamily: Typography.family, color: palette.inkSoft, fontSize: Typography.small, fontWeight: '800' },
  modeButtonLabelSelected: { color: palette.primaryDark },
  fieldGroup: { gap: Spacing.xs },
  passwordLabelRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  label: { fontFamily: Typography.family, color: palette.ink, fontSize: Typography.small, fontWeight: '800' },
  hint: { fontFamily: Typography.family, color: palette.inkSoft, fontSize: Typography.caption },
  input: { minHeight: 50, borderWidth: 1, borderColor: palette.lineBright, backgroundColor: palette.canvasRaised, borderRadius: Radius.sm, paddingHorizontal: Spacing.sm, color: palette.ink, fontFamily: Typography.family, fontSize: Typography.body },
  passwordInputWrap: { minHeight: 50, flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: palette.lineBright, backgroundColor: palette.canvasRaised, borderRadius: Radius.sm },
  passwordInput: { flex: 1, minHeight: 48, paddingLeft: Spacing.sm, color: palette.ink, fontFamily: Typography.family, fontSize: Typography.body },
  visibilityButton: { width: 48, minHeight: 48, alignItems: 'center', justifyContent: 'center' },
  errorBox: { flexDirection: 'row', gap: Spacing.xs, alignItems: 'flex-start', backgroundColor: palette.dangerPale, borderWidth: 1, borderColor: palette.danger, borderRadius: Radius.sm, padding: Spacing.sm },
  errorText: { flex: 1, fontFamily: Typography.family, color: palette.dangerText, fontSize: Typography.small, lineHeight: 20 },
  privacy: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.sm },
  privacyCopy: { flex: 1, gap: 3 },
  privacyTitle: { fontFamily: Typography.family, color: palette.warningText, fontSize: Typography.small, fontWeight: '900' },
  privacyText: { fontFamily: Typography.family, color: palette.warningTextSoft, fontSize: Typography.caption, lineHeight: 19 },
  pressed: { opacity: 0.76 },
});
