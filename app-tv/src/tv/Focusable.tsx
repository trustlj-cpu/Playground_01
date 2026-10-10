// A focusable, pressable surface for the remote. Focus looks like the web's keyboard focus
// (edition CSS `.story:focus-visible{outline:2px solid var(--red);outline-offset:4px}`), scaled (tv/web.ts).
// Native TV: Pressable is focusable by the tvOS / Android TV focus engine; `autoFocus` maps to hasTVPreferredFocus.
// Web: react-native-web renders it with tabindex=0, keysource.ts moves focus between them with the arrow keys,
// and `autoFocus` focuses the element in an effect.
import React, { useEffect, useRef, useState } from 'react';
import { Animated, Platform, Pressable, StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import { useColors } from '../settings';
import { markActivity } from './activity';
import { reveal } from './keysource';
import { useWeb } from './web';

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

export default function Focusable({ onPress, onFocus, onBlur, autoFocus, style, focusedStyle, scale = 1, radius = 0, ring = true, label, testID, children }: FocusableProps) {
  const c = useColors();
  const w = useWeb();
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

  const ringW = Math.max(2, Math.round(w.px(2)));
  const inset = -(w.px(4) + ringW);
  return (
    <Pressable
      ref={ref}
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={label}
      hasTVPreferredFocus={!!autoFocus}
      onFocus={() => {
        setFocused(true);
        markActivity(); // a focus change is activity (lean-back idle timer)
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
            style={[styles.ring, { top: inset, left: inset, right: inset, bottom: inset, borderRadius: radius ? radius + w.px(4) : 0, borderWidth: ringW, borderColor: c.red }]}
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
