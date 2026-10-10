// Breaking-news ticker under the masthead (same live feed as the web, polled every 60 s by App).
// The whole bar is one focusable control: OK opens the full breaking list overlay.
import React, { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Platform, StyleSheet, Text, View } from 'react-native';
import { breakingLabel } from '../shared/i18n';
import { sans } from '../shared/theme';
import type { BreakingItem } from '../shared/types';
import { useColors } from '../settings';
import Focusable from '../tv/Focusable';
import { useTV } from '../tv/scale';
import { ago } from './breaking';

const SPEED = 90; // 1080p px per second

export default function Ticker({ items, lang, onOpen }: { items: BreakingItem[]; lang: string; onOpen: () => void }) {
  const c = useColors();
  const { u } = useTV();
  const label = breakingLabel(lang);
  const [vw, setVw] = useState(0);
  const [w1, setW1] = useState(0);
  const x = useRef(new Animated.Value(0)).current;
  const key = items.map((i) => i.u).join('|');

  useEffect(() => {
    if (!vw || !w1) return;
    x.setValue(vw);
    const anim = Animated.loop(Animated.timing(x, { toValue: -w1, duration: ((w1 + vw) / (SPEED * u)) * 1000, easing: Easing.linear, useNativeDriver: Platform.OS !== 'web' }));
    anim.start();
    return () => anim.stop();
  }, [vw, w1, key, x, u]);

  if (!items.length) return null;
  const h = 56 * u;
  return (
    <Focusable onPress={onOpen} scale={1.01} radius={4 * u} label={label} testID="ticker" style={[styles.bar, { height: h, borderBottomColor: c.rule, borderBottomWidth: Math.max(1, 2 * u) }]}>
      <View style={[styles.label, { backgroundColor: c.red, paddingHorizontal: 16 * u, marginRight: 18 * u, height: 40 * u, borderRadius: 4 * u }]}>
        <Text style={[sans(700), { fontSize: 22 * u, letterSpacing: 1.2 * u, color: c.paper }]}>{label} ▸</Text>
      </View>
      <View style={styles.viewport} onLayout={(e) => setVw(e.nativeEvent.layout.width)}>
        <View style={styles.track}>
          <Animated.View style={[styles.row, { height: h, transform: [{ translateX: x }] }]} onLayout={(e) => setW1(e.nativeEvent.layout.width)}>
            {items.map((it, i) => (
              <Text key={it.u + i} style={[sans(400), { fontSize: 26 * u, marginRight: 64 * u, color: c.ink }]} numberOfLines={1}>
                {it.t}
                {!!it.at && <Text style={{ color: c.mute, fontSize: 20 * u }}>{'   ' + ago(it.at)}</Text>}
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
  label: { justifyContent: 'center' },
  viewport: { flex: 1, overflow: 'hidden', alignSelf: 'stretch' },
  track: { position: 'absolute', left: 0, top: 0, bottom: 0, width: 40000 },
  row: { flexDirection: 'row', alignSelf: 'flex-start', alignItems: 'center' },
});
