import { StyleSheet, View } from 'react-native';
import Svg, { Circle, Defs, RadialGradient, Stop } from 'react-native-svg';

import { useAppTheme } from '@/hooks/use-app-theme';

export function AiOrb({ size = 156 }: { size?: number }) {
  const { palette } = useAppTheme();
  return (
    <View style={{ width: size, height: size }} accessible={false}>
      <Svg width={size} height={size} viewBox="0 0 156 156" style={StyleSheet.absoluteFill}>
        <Defs>
          <RadialGradient id="core" cx="48%" cy="42%" r="58%">
            <Stop offset="0" stopColor="#FFFFFF" stopOpacity="0.98" />
            <Stop offset="0.2" stopColor={palette.accent} stopOpacity="0.95" />
            <Stop offset="0.58" stopColor={palette.secondary} stopOpacity="0.82" />
            <Stop offset="1" stopColor={palette.primary} stopOpacity="0.08" />
          </RadialGradient>
        </Defs>
        <Circle cx="78" cy="78" r="72" fill="none" stroke={palette.line} strokeWidth="1" />
        <Circle
          cx="78"
          cy="78"
          r="56"
          fill="none"
          stroke={palette.primaryDark}
          strokeWidth="1.5"
          strokeDasharray="4 9"
          opacity="0.74"
        />
        <Circle cx="78" cy="78" r="38" fill="url(#core)" />
        <Circle cx="42" cy="51" r="4" fill={palette.accent} />
        <Circle cx="119" cy="93" r="5" fill={palette.secondary} />
        <Circle cx="67" cy="129" r="3" fill={palette.primaryDark} />
      </Svg>
    </View>
  );
}
