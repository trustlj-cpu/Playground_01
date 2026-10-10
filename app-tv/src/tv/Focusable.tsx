// A focusable, pressable surface for the remote: scales up slightly and draws a red focus ring when focused.
// Native TV: Pressable is focusable by the tvOS / Android TV focus engine; `autoFocus` maps to hasTVPreferredFocus.
// Web: react-native-web renders it with tabindex=0, keysource.ts moves focus between them with the arrow keys,
// and `autoFocus` focuses the element in an effect.
import React, { useEffect, useRef, useState } from 'react';
import { Animated, Platform, Pressable, StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import { useColors } from '../settings';
import { reveal } from './keysource';
import { useTV } from './scale';

export interface FocusableProps {
  onPress?: () => void;
  onFocus?: () => void;
  onBlur?: () => void;
  autoFocus?: boolean;
  style?: StyleProp<ViewStyle>;
  /** extra style applied to the surface while focused */
  focusedStyle?: StyleProp<ViewStyle>;
  scale?: number;
  radius?: number;
  ring?: boolean;
  label?: string;
  testID?: string;
  children: React.ReactNode | ((focused: boolean) => React.ReactNode);
}

const native = Platform.OS !== 'web';

export default function Focusable({ onPress, onFocus, onBlur, autoFocus, style, focusedStyle, scale = 1.04, radius = 6, ring = true, label, testID, children }: FocusableProps) {
  const c = useColors();
  const { u } = useTV();
  const [focused, setFocused] = useState(false);
  const s = useRef(new Animated.Value(1)).current;
  const ref = useRef<View>(null);

  useEffect(() => {
    Animated.timing(s, { toValue: focused ? scale : 1, duration: 140, useNativeDriver: native }).start();
  }, [focused, scale, s]);

  useEffect(() => {
    if (!native && autoFocus) {
      const el = ref.current as unknown as HTMLElement | null;
      const t = setTimeout(() => {
        el?.focus?.({ preventScroll: true });
        if (el) reveal(el, false);
      }, 30);
      return () => clearTimeout(t);
    }
  }, [autoFocus]);

  const inset = -Math.max(5, 7 * u);
  return (
    <Pressable
      ref={ref}
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={label}
      hasTVPreferredFocus={!!autoFocus}
      onFocus={() => {
        setFocused(true);
        onFocus?.();
      }}
      onBlur={() => {
        setFocused(false);
        onBlur?.();
      }}
      onPress={onPress}
      style={styles.press as any}
    >
      <Animated.View style={{ transform: [{ scale: s }] }}>
        <View style={[style, { borderRadius: radius }, focused && focusedStyle]}>{typeof children === 'function' ? children(focused) : children}</View>
        {ring && focused && (
          <View
            pointerEvents="none"
            style={[styles.ring, { top: inset, left: inset, right: inset, bottom: inset, borderRadius: radius + 4, borderWidth: Math.max(3, 4 * u), borderColor: c.red }]}
          />
        )}
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  press: Platform.select({ web: { outlineStyle: 'none', cursor: 'pointer' } as any, default: {} }),
  ring: { position: 'absolute' },
});
