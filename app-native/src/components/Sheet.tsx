// Bottom sheet used for the article popup and the breaking-news list.
// Owner rule: no close button — it closes by tapping outside (the dimmed area) or swiping down.
import React, { useCallback, useEffect, useRef } from 'react';
import { Animated, PanResponder, Platform, Pressable, ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { SHEET_MAX } from '../lib/layout';
import { useColors } from '../lib/settings';

interface Props {
  onClose: () => void;
  children: React.ReactNode;
  /** a value that changes when the content changes, to reset scroll */
  contentKey?: string;
  label?: string;
  /** size to content (up to full height) instead of always full height */
  fit?: boolean;
}

const NATIVE = Platform.OS !== 'web';

export default function Sheet({ onClose, children, contentKey, label, fit }: Props) {
  const c = useColors();
  const insets = useSafeAreaInsets();
  const { width: W, height: H } = useWindowDimensions();
  // tablets / foldables / wide screens: a centred card (max 720 wide) with the paper dimmed around it,
  // instead of a full-width, full-height sheet with 180-character lines
  const card = W >= 700;
  const cardW = Math.min(SHEET_MAX, W - 48);
  const vMargin = Math.max(insets.top + 24, Math.round(H * 0.08));
  const y = useRef(new Animated.Value(H)).current;
  const fade = useRef(new Animated.Value(0)).current;
  const scrollY = useRef(0);
  const closing = useRef(false);
  const scrollRef = useRef<ScrollView>(null);

  useEffect(() => {
    closing.current = false;
    Animated.parallel([
      Animated.spring(y, { toValue: 0, useNativeDriver: NATIVE, damping: 26, stiffness: 260, mass: 0.9 }),
      Animated.timing(fade, { toValue: 1, duration: 180, useNativeDriver: NATIVE }),
    ]).start();
  }, [y, fade]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ y: 0, animated: false });
    scrollY.current = 0;
  }, [contentKey]);

  const close = useCallback(() => {
    if (closing.current) return;
    closing.current = true;
    Animated.parallel([
      Animated.timing(y, { toValue: H, duration: 200, useNativeDriver: NATIVE }),
      Animated.timing(fade, { toValue: 0, duration: 200, useNativeDriver: NATIVE }),
    ]).start(() => onClose());
  }, [y, fade, H, onClose]);

  const pan = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponderCapture: (_, g) => scrollY.current <= 0 && g.dy > 8 && Math.abs(g.dy) > Math.abs(g.dx) * 1.5,
      onMoveShouldSetPanResponder: (_, g) => scrollY.current <= 0 && g.dy > 8 && Math.abs(g.dy) > Math.abs(g.dx) * 1.5,
      onPanResponderMove: (_, g) => y.setValue(Math.max(0, g.dy)),
      onPanResponderRelease: (_, g) => {
        if (g.dy > 110 || g.vy > 1.1) close();
        else Animated.spring(y, { toValue: 0, useNativeDriver: NATIVE, damping: 24, stiffness: 260 }).start();
      },
      onPanResponderTerminate: () => Animated.spring(y, { toValue: 0, useNativeDriver: NATIVE }).start(),
    }),
  ).current;

  return (
    <View style={StyleSheet.absoluteFill} accessibilityViewIsModal>
      <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: c.scrim, opacity: fade }]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={close} accessibilityRole="button" accessibilityLabel={label} />
      </Animated.View>
      <Animated.View
        {...pan.panHandlers}
        style={[
          styles.sheet,
          card ? [styles.card, { left: (W - cardW) / 2, width: cardW }] : styles.full,
          {
            ...(card
              ? fit
                ? { top: vMargin, maxHeight: H - 2 * vMargin }
                : { top: vMargin, bottom: Math.max(insets.bottom + 24, vMargin) }
              : fit
                ? { bottom: 0, maxHeight: H - insets.top - 18 }
                : { bottom: 0, top: insets.top + 18 }),
            backgroundColor: c.dark ? c.paper2 : c.paper,
            borderColor: c.dark ? '#3a352d' : c.ink,
            transform: [{ translateY: y }],
          },
        ]}
      >
        <View style={styles.grabWrap} accessible={false}>
          <View style={[styles.grab, { backgroundColor: c.mute }]} />
        </View>
        <ScrollView
          ref={scrollRef}
          style={fit ? undefined : { flex: 1 }}
          contentContainerStyle={{ paddingHorizontal: card ? 32 : 18, paddingBottom: card ? 32 : insets.bottom + 40 }}
          scrollEventThrottle={16}
          onScroll={(e) => {
            scrollY.current = e.nativeEvent.contentOffset.y;
          }}
          onScrollEndDrag={(e) => {
            // iOS bounce: a firm pull past the top also closes
            if (e.nativeEvent.contentOffset.y < -90) close();
          }}
        >
          {children}
        </ScrollView>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  sheet: {
    position: 'absolute',
    overflow: 'hidden',
    elevation: 16,
  },
  full: {
    left: 0,
    right: 0,
    borderTopWidth: 1,
    borderLeftWidth: StyleSheet.hairlineWidth,
    borderRightWidth: StyleSheet.hairlineWidth,
    borderTopLeftRadius: 10,
    borderTopRightRadius: 10,
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: -4 },
  },
  // web .pop: box-shadow 0 12px 40px rgba(0,0,0,.3)
  card: { borderWidth: 1, borderRadius: 10, boxShadow: '0px 12px 40px rgba(0,0,0,0.3)' },
  grabWrap: { alignItems: 'center', paddingTop: 8, paddingBottom: 6 },
  grab: { width: 38, height: 4, borderRadius: 2, opacity: 0.45 },
});
