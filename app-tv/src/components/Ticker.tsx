// Breaking-news bar under the market tape, styled exactly as the web's .brk (site/build.js BREAK):
// red bold label, one scrolling line of headlines with the age in small grey, 1 px ink rule below.
// The bar is one focusable control: OK opens the breaking list (the web's label button does the same).
// Items come from the isolated breaking store (shared/breakingStore.tsx), so polls never re-render Home.
import React, { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Platform, StyleSheet, Text, View } from 'react-native';
import { useBreakingItems } from '../shared/breakingStore';
import { breakingLabel } from '../shared/i18n';
import { sans } from '../shared/theme';
import { useColors } from '../settings';
import Focusable from '../tv/Focusable';
import { useWeb } from '../tv/web';
import { ago } from './breaking';

const SPEED = 70; // web: duration = (w1 + vw) / 70 s → 70 CSS px per second

export default function Ticker({ lang, onOpen, onFocus, autoFocus }: { lang: string; onOpen: () => void; onFocus?: () => void; autoFocus?: boolean }) {
  const items = useBreakingItems();
  const c = useColors();
  const w = useWeb();
  const label = breakingLabel(lang);
  const [vw, setVw] = useState(0);
  const [w1, setW1] = useState(0);
  const x = useRef(new Animated.Value(0)).current;
  const key = items.map((i) => i.u).join('|');

  useEffect(() => {
    if (!vw || !w1) return;
    x.setValue(vw);
    const anim = Animated.loop(Animated.timing(x, { toValue: -w1, duration: ((w1 + vw) / (SPEED * w.k)) * 1000, easing: Easing.linear, useNativeDriver: Platform.OS !== 'web' }));
    anim.start();
    return () => anim.stop();
  }, [vw, w1, key, x, w.k]);

  if (!items.length) return null;
  const h = w.px(26);
  const fs = w.fs(13);
  return (
    <Focusable onPress={onOpen} onFocus={onFocus} autoFocus={autoFocus} label={label} testID="ticker" style={[styles.bar, { height: Math.max(h, fs * 1.6), borderBottomColor: c.ink, borderBottomWidth: w.hair, backgroundColor: c.paper }]}>
      <Text style={[sans(700), { fontSize: w.fs(12), letterSpacing: w.ls(0.06, w.fs(12)), color: c.red, paddingRight: w.px(10), paddingLeft: w.px(2) }]}>{label}</Text>
      <View style={styles.viewport} onLayout={(e) => setVw(e.nativeEvent.layout.width)}>
        <View style={styles.track}>
          <Animated.View style={[styles.row, { transform: [{ translateX: x }] }]} onLayout={(e) => setW1(e.nativeEvent.layout.width)}>
            {items.map((it) => (
              <Text key={it.u} style={[sans(400), { fontSize: fs, marginRight: w.px(34), color: c.ink }]} numberOfLines={1}>
                {it.t}
                {!!it.at && <Text style={{ color: c.mute, fontSize: w.fs(11) }}>{'  ' + ago(it.at)}</Text>}
              </Text>
            ))}
          </Animated.View>
        </View>
      </View>
    </Focusable>
  );
}

const styles = StyleSheet.create({
  bar: { flexDirection: 'row', alignItems: 'center', overflow: 'hidden' },
  viewport: { flex: 1, overflow: 'hidden', alignSelf: 'stretch' },
  track: { position: 'absolute', left: 0, top: 0, bottom: 0, width: 40000, justifyContent: 'center' },
  row: { flexDirection: 'row', alignSelf: 'flex-start', alignItems: 'center' },
});
