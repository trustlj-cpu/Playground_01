import React from 'react';
import { Pressable, StyleSheet } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { useColors } from '../lib/settings';

// Same glyph as the website (account-ui.js): outlined ribbon, filled red when saved.
export default function BookmarkButton({ on, onPress, label, size = 18 }: { on: boolean; onPress: () => void; label: string; size?: number }) {
  const c = useColors();
  const col = on ? c.red : c.ink;
  return (
    <Pressable
      onPress={(e) => {
        (e as any)?.stopPropagation?.();
        onPress();
      }}
      hitSlop={6}
      accessibilityRole="button"
      accessibilityState={{ selected: on }}
      accessibilityLabel={label}
      style={({ pressed }) => [styles.btn, pressed && { opacity: 0.5 }]}
    >
      <Svg width={size} height={size} viewBox="0 0 24 24">
        <Path d="M6.5 3.5h11v17l-5.5-4.1-5.5 4.1z" fill={on ? col : 'none'} stroke={col} strokeWidth={1.6} strokeLinejoin="round" />
      </Svg>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  btn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center', marginRight: -8 },
});
