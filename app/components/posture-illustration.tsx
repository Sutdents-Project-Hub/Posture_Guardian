import { StyleSheet, View } from 'react-native';
import Svg, { Circle, Line, Path } from 'react-native-svg';

import { Radius, type ThemePalette } from '@/constants/design';
import { useAppTheme, useThemedStyles } from '@/hooks/use-app-theme';

export function PostureIllustration() {
  const { palette } = useAppTheme();
  const styles = useThemedStyles(createStyles);
  return (
    <View style={styles.frame} accessible={false}>
      <Svg viewBox="0 0 260 220" width="100%" height="100%">
        <Path
          d="M51 184 H207 M184 181 V109 H219 V181 M184 131 H219"
          stroke={palette.lineBright}
          strokeWidth="8"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
        <Circle cx="121" cy="45" r="22" fill={palette.accentPale} stroke={palette.ink} strokeWidth="7" />
        <Path
          d="M120 68 C117 92, 121 115, 143 132 C151 139, 161 143, 181 145"
          stroke={palette.ink}
          strokeWidth="9"
          strokeLinecap="round"
          fill="none"
        />
        <Path
          d="M129 84 C150 91, 163 99, 180 110 M145 132 C130 150, 123 164, 122 181"
          stroke={palette.ink}
          strokeWidth="8"
          strokeLinecap="round"
          fill="none"
        />
        <Line x1="106" y1="75" x2="106" y2="129" stroke={palette.primary} strokeWidth="3" strokeDasharray="7 7" />
        <Path d="M102 72 L106 65 L110 72" fill="none" stroke={palette.primary} strokeWidth="3" />
        <Circle cx="106" cy="134" r="7" fill={palette.primary} />
        <Circle cx="181" cy="109" r="6" fill={palette.accent} />
      </Svg>
    </View>
  );
}

const createStyles = (palette: ThemePalette) => StyleSheet.create({
  frame: {
    width: '100%',
    maxWidth: 300,
    aspectRatio: 1.18,
    backgroundColor: palette.primaryPale,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: palette.primaryDark,
    overflow: 'hidden',
  },
});
