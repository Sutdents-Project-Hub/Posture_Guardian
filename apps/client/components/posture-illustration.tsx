import { StyleSheet, View } from 'react-native';
import Svg, { Circle, Line, Path } from 'react-native-svg';

import { Palette, Radius } from '@/constants/design';

export function PostureIllustration() {
  return (
    <View style={styles.frame} accessible={false}>
      <Svg viewBox="0 0 260 220" width="100%" height="100%">
        <Path
          d="M51 184 H207 M184 181 V109 H219 V181 M184 131 H219"
          stroke="#89AAA3"
          strokeWidth="8"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
        <Circle cx="121" cy="45" r="22" fill={Palette.accentPale} stroke={Palette.ink} strokeWidth="7" />
        <Path
          d="M120 68 C117 92, 121 115, 143 132 C151 139, 161 143, 181 145"
          stroke={Palette.ink}
          strokeWidth="9"
          strokeLinecap="round"
          fill="none"
        />
        <Path
          d="M129 84 C150 91, 163 99, 180 110 M145 132 C130 150, 123 164, 122 181"
          stroke={Palette.ink}
          strokeWidth="8"
          strokeLinecap="round"
          fill="none"
        />
        <Line x1="106" y1="75" x2="106" y2="129" stroke={Palette.primary} strokeWidth="3" strokeDasharray="7 7" />
        <Path d="M102 72 L106 65 L110 72" fill="none" stroke={Palette.primary} strokeWidth="3" />
        <Circle cx="106" cy="134" r="7" fill={Palette.primary} />
        <Circle cx="181" cy="109" r="6" fill={Palette.accent} />
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  frame: {
    width: '100%',
    maxWidth: 300,
    aspectRatio: 1.18,
    backgroundColor: Palette.primaryPale,
    borderRadius: Radius.lg,
    overflow: 'hidden',
  },
});
