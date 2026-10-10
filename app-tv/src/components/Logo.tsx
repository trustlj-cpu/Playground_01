import React from 'react';
import Svg, { Circle, Path } from 'react-native-svg';
import { useColors } from '../settings';
import { LOGO_DOT, LOGO_PATH } from '../shared/logoPath';

/** DailyDrop blackletter wordmark (viewBox 0 0 894 243). */
export default function Logo({ width, color, dot }: { width: number; color?: string; dot?: string }) {
  const c = useColors();
  return (
    <Svg width={width} height={(width * 243) / 894} viewBox="0 0 894 243" accessibilityLabel="DailyDrop.">
      <Path d={LOGO_PATH} fill={color || c.head} />
      <Circle cx={LOGO_DOT.cx} cy={LOGO_DOT.cy} r={LOGO_DOT.r} fill={dot || c.logoDot} />
    </Svg>
  );
}
