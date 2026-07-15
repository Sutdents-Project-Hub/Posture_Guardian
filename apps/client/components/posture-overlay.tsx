import { StyleSheet, View } from 'react-native';
import Svg, { Circle, Line } from 'react-native-svg';

import { Palette } from '@/constants/design';
import type { Landmark } from '@/types/posture';

const CONNECTIONS: [number, number][] = [
  [7, 11],
  [8, 12],
  [11, 12],
  [11, 23],
  [12, 24],
  [23, 24],
  [11, 13],
  [13, 15],
  [12, 14],
  [14, 16],
  [23, 25],
  [25, 27],
  [24, 26],
  [26, 28],
];

export function PostureOverlay({
  landmarks,
  attention = false,
}: {
  landmarks: Landmark[];
  attention?: boolean;
}) {
  const visible = new Map(
    landmarks.filter((point) => point.visibility >= 0.5).map((point) => [point.index, point]),
  );
  const color = attention ? Palette.accent : '#75F0CE';
  return (
    <View style={[StyleSheet.absoluteFill, styles.nonInteractive]}>
      <Svg width="100%" height="100%" viewBox="0 0 1 1" preserveAspectRatio="none">
        {CONNECTIONS.map(([startIndex, endIndex]) => {
          const start = visible.get(startIndex);
          const end = visible.get(endIndex);
          if (!start || !end) return null;
          return (
            <Line
              key={`${startIndex}-${endIndex}`}
              x1={start.x}
              y1={start.y}
              x2={end.x}
              y2={end.y}
              stroke={color}
              strokeWidth={0.006}
              strokeLinecap="round"
              opacity={0.9}
            />
          );
        })}
        {[7, 8, 11, 12, 23, 24].map((index) => {
          const point = visible.get(index);
          if (!point) return null;
          return <Circle key={index} cx={point.x} cy={point.y} r={0.012} fill={color} />;
        })}
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  nonInteractive: { pointerEvents: 'none' },
});
