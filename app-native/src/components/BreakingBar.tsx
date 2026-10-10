// Breaking-news ticker under the masthead. Polls the live endpoint every 60 s while the app is in
// the foreground (same feed as the web). Tapping the red label opens the full list sheet.
import React, { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Linking, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { breakingLabel } from '../i18n';
import { useColors } from '../lib/settings';
import { sans } from '../lib/theme';
import type { BreakingItem } from '../lib/types';
import { useResource } from '../lib/useResource';
import { ago } from './BreakingList';
import { useOverlay } from './Overlay';

const SPEED = 70; // px per second, as on the web

export default function BreakingBar({ path, lang }: { path: string; lang: string }) {
  const c = useColors();
  const { openBreaking } = useOverlay();
  const res = useResource<{ items: BreakingItem[] }>(path, { pollMs: 60_000 });
  const items = (res.data && res.data.items) || [];
  const label = breakingLabel(lang);
  const [vw, setVw] = useState(0);
  const [w1, setW1] = useState(0);
  const x = useRef(new Animated.Value(0)).current;
  const key = items.map((i) => i.u).join('|');

  useEffect(() => {
    if (!vw || !w1) return;
    x.setValue(vw);
    const anim = Animated.loop(
      Animated.timing(x, { toValue: -w1, duration: ((w1 + vw) / SPEED) * 1000, easing: Easing.linear, useNativeDriver: Platform.OS !== 'web' }),
    );
    anim.start();
    return () => anim.stop();
  }, [vw, w1, key, x]);

  if (!items.length) return null;
  return (
    <View style={[styles.bar, { borderBottomColor: c.ink }]} accessibilityRole="summary" accessibilityLabel={label}>
      <Pressable onPress={() => openBreaking(items, label, lang)} hitSlop={8} accessibilityRole="button" accessibilityLabel={label}>
        <Text style={[sans(700), styles.label, { color: c.red }]}>{label}</Text>
      </Pressable>
      <View style={styles.viewport} onLayout={(e) => setVw(e.nativeEvent.layout.width)}>
        <View style={styles.track}>
          <Animated.View style={[styles.row, { transform: [{ translateX: x }] }]} onLayout={(e) => setW1(e.nativeEvent.layout.width)}>
            {items.map((it, i) => (
              <Text key={it.u + i} style={[sans(400), styles.item, { color: c.ink }]} onPress={() => Linking.openURL(it.u).catch(() => {})}>
                {it.t}
                {!!it.at && <Text style={{ color: c.mute, fontSize: 11 }}>{'  ' + ago(it.at)}</Text>}
              </Text>
            ))}
          </Animated.View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: { flexDirection: 'row', alignItems: 'stretch', height: 27, borderBottomWidth: 1, overflow: 'hidden' },
  label: { fontSize: 12, letterSpacing: 0.7, lineHeight: 26, paddingRight: 10, paddingLeft: 2 },
  viewport: { flex: 1, overflow: 'hidden' },
  track: { position: 'absolute', left: 0, top: 0, bottom: 0, width: 20000 },
  row: { flexDirection: 'row', alignSelf: 'flex-start', height: 26, alignItems: 'center' },
  item: { fontSize: 13, lineHeight: 26, marginRight: 34, flexShrink: 0 },
});
