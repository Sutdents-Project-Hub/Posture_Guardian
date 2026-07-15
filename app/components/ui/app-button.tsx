import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { ActivityIndicator, Pressable, StyleSheet, Text, ViewStyle } from 'react-native';

import { Radius, Spacing, Typography, type ThemePalette } from '@/constants/design';
import { useAppTheme, useThemedStyles } from '@/hooks/use-app-theme';

type Props = {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  icon?: keyof typeof MaterialIcons.glyphMap;
  disabled?: boolean;
  loading?: boolean;
  fullWidth?: boolean;
  style?: ViewStyle;
  accessibilityHint?: string;
};

export function AppButton({
  label,
  onPress,
  variant = 'primary',
  icon,
  disabled,
  loading,
  fullWidth,
  style,
  accessibilityHint,
}: Props) {
  const { gradients, palette } = useAppTheme();
  const styles = useThemedStyles(createStyles);
  const isDisabled = disabled || loading;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled: isDisabled, busy: loading }}
      disabled={isDisabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.base,
        styles[variant],
        fullWidth && styles.fullWidth,
        pressed && styles.pressed,
        isDisabled && styles.disabled,
        style,
      ]}>
      {variant === 'primary' ? (
        <LinearGradient colors={gradients.primary} style={StyleSheet.absoluteFill} />
      ) : null}
      <>
        {loading ? (
          <ActivityIndicator
            size="small"
            color={variant === 'primary' || variant === 'danger' ? palette.white : palette.primaryDark}
          />
        ) : icon ? (
          <MaterialIcons
            name={icon}
            size={20}
            color={variant === 'primary' || variant === 'danger' ? palette.white : palette.primaryDark}
          />
        ) : null}
        <Text
          style={[
            styles.label,
            variant === 'primary' || variant === 'danger' ? styles.lightLabel : styles.darkLabel,
          ]}>
          {label}
        </Text>
      </>
    </Pressable>
  );
}

const createStyles = (palette: ThemePalette) => StyleSheet.create({
  base: {
    minHeight: 48,
    minWidth: 48,
    borderRadius: Radius.pill,
    paddingHorizontal: Spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: Spacing.xs,
    borderWidth: 1,
    overflow: 'hidden',
  },
  primary: { backgroundColor: palette.primary, borderColor: '#8E7AFF' },
  secondary: { backgroundColor: palette.primaryPale, borderColor: palette.primaryDark },
  ghost: { backgroundColor: 'transparent', borderColor: palette.line },
  danger: { backgroundColor: palette.danger, borderColor: palette.danger },
  fullWidth: { width: '100%' },
  pressed: { opacity: 0.78, transform: [{ scale: 0.985 }] },
  disabled: { opacity: 0.45 },
  label: {
    fontFamily: Typography.family,
    fontSize: Typography.body,
    fontWeight: '700',
  },
  lightLabel: { color: palette.white },
  darkLabel: { color: palette.primaryDark },
});
