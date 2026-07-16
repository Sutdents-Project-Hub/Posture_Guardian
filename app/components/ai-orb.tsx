import { StyleSheet, View } from 'react-native';
import Svg, { Circle, Line, Path, Rect } from 'react-native-svg';

import { Radius, Shadow } from '@/constants/design';
import { useAppTheme } from '@/hooks/use-app-theme';

export function AiOrb({ size = 156 }: { size?: number }) {
  const { palette } = useAppTheme();
  return (
    <View
      style={[
        styles.frame,
        {
          width: size,
          height: size,
          backgroundColor: palette.primary,
          borderColor: palette.heroInk,
        },
      ]}
      accessible={false}>
      <Svg width={size} height={size} viewBox="0 0 156 156" style={StyleSheet.absoluteFill}>
        <Rect x="10" y="10" width="136" height="136" fill="none" stroke={palette.heroInk} strokeWidth="1.2" />

        <Line x1="20" y1="31" x2="71" y2="31" stroke={palette.heroInk} strokeWidth="1.2" />
        <Line x1="20" y1="36" x2="51" y2="36" stroke={palette.heroInk} strokeWidth="1.2" />

        <Circle cx="54" cy="59" r="12" fill={palette.white} fillOpacity="0.42" stroke={palette.heroInk} strokeWidth="2" />
        <Path
          d="M53 71 C51 84 55 94 65 102 C71 108 75 117 75 131"
          fill="none"
          stroke={palette.heroInk}
          strokeWidth="3"
          strokeLinecap="square"
        />
        <Path
          d="M54 79 C42 86 37 97 36 112 M57 83 L82 95 L102 91 M65 102 L43 128 M71 107 L100 125"
          fill="none"
          stroke={palette.heroInk}
          strokeWidth="2"
          strokeLinecap="square"
          strokeLinejoin="miter"
        />
        <Circle cx="54" cy="80" r="3" fill={palette.secondary} stroke={palette.heroInk} strokeWidth="1" />
        <Circle cx="65" cy="102" r="3" fill={palette.secondary} stroke={palette.heroInk} strokeWidth="1" />
        <Circle cx="82" cy="95" r="3" fill={palette.secondary} stroke={palette.heroInk} strokeWidth="1" />

        <Rect x="94" y="38" width="40" height="21" fill={palette.white} fillOpacity="0.56" stroke={palette.heroInk} strokeWidth="1.3" />
        <Line x1="100" y1="51" x2="106" y2="45" stroke={palette.heroInk} strokeWidth="1.5" />
        <Line x1="106" y1="45" x2="112" y2="49" stroke={palette.heroInk} strokeWidth="1.5" />
        <Line x1="112" y1="49" x2="121" y2="42" stroke={palette.heroInk} strokeWidth="1.5" />
        <Line x1="121" y1="42" x2="128" y2="46" stroke={palette.heroInk} strokeWidth="1.5" />

        <Rect x="103" y="68" width="31" height="7" fill={palette.heroInk} />
        <Rect x="103" y="79" width="22" height="7" fill={palette.secondary} stroke={palette.heroInk} strokeWidth="1" />
        <Rect x="103" y="90" width="27" height="7" fill={palette.white} fillOpacity="0.55" stroke={palette.heroInk} strokeWidth="1" />

        <Line x1="21" y1="137" x2="135" y2="137" stroke={palette.heroInk} strokeWidth="1.2" />
        <Rect x="21" y="132" width="52" height="5" fill={palette.secondary} stroke={palette.heroInk} strokeWidth="1" />
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  frame: {
    borderWidth: 2,
    borderRadius: Radius.sm,
    overflow: 'hidden',
    ...Shadow,
  },
});
