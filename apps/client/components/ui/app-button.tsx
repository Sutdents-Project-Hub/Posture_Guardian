import { MaterialIcons } from '@expo/vector-icons';
import { ActivityIndicator, Pressable, StyleSheet, Text, ViewStyle } from 'react-native';

import { Palette, Radius, Spacing, Typography } from '@/constants/design';

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
      {loading ? (
        <ActivityIndicator
          size="small"
          color={variant === 'primary' || variant === 'danger' ? Palette.white : Palette.primary}
        />
      ) : icon ? (
        <MaterialIcons
          name={icon}
          size={20}
          color={variant === 'primary' || variant === 'danger' ? Palette.white : Palette.primary}
        />
      ) : null}
      <Text
        style={[
          styles.label,
          variant === 'primary' || variant === 'danger' ? styles.lightLabel : styles.darkLabel,
        ]}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
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
  },
  primary: { backgroundColor: Palette.primary, borderColor: Palette.primary },
  secondary: { backgroundColor: Palette.surface, borderColor: Palette.primary },
  ghost: { backgroundColor: 'transparent', borderColor: Palette.line },
  danger: { backgroundColor: Palette.warning, borderColor: Palette.warning },
  fullWidth: { width: '100%' },
  pressed: { opacity: 0.78, transform: [{ scale: 0.985 }] },
  disabled: { opacity: 0.45 },
  label: {
    fontFamily: Typography.family,
    fontSize: Typography.body,
    fontWeight: '700',
  },
  lightLabel: { color: Palette.white },
  darkLabel: { color: Palette.primaryDark },
});
