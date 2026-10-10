import React, { useRef } from 'react';
import { Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';
import { setIntroTarget } from '../lib/introTarget';
import { useColors } from '../lib/settings';
import { serif } from '../lib/theme';
import type { Edition } from '../lib/types';
import { LOGO_DOT, LOGO_PATH } from './logoPath';

export function Logo({ width }: { width: number }) {
  const c = useColors();
  return (
    <Svg width={width} height={(width * 243) / 894} viewBox="0 0 894 243" accessibilityLabel="DailyDrop.">
      <Path d={LOGO_PATH} fill={c.head} />
      <Circle cx={LOGO_DOT.cx} cy={LOGO_DOT.cy} r={LOGO_DOT.r} fill={c.logoDot} />
    </Svg>
  );
}

/** Newspaper masthead: blackletter wordmark, then the dateline between two thin rules:
 *  edition No. · ▼ place, date · 06:00 local time. */
export default function Masthead({ edition, onPlace }: { edition: Edition; onPlace?: () => void }) {
  const c = useColors();
  const { width } = useWindowDimensions();
  const lang = edition.lang;
  const m = edition.mast;
  // the opening animation (Intro) ends by rising into this wordmark
  const logoRef = useRef<View>(null);
  const report = () =>
    setIntroTarget(
      () =>
        new Promise((done) => {
          const v = logoRef.current;
          if (!v) return done(null);
          v.measureInWindow((x, y, w, h) => done(w > 0 ? { x, y, width: w, height: h } : null));
        }),
    );
  return (
    <View style={styles.wrap}>
      <View style={styles.logo}>
        <View ref={logoRef} onLayout={report} collapsable={false}>
          <Logo width={Math.min(330, width * 0.84)} />
        </View>
      </View>
      <View style={[styles.dateline, { borderColor: c.ink }]}>
        <Text style={[serif(lang), styles.side, { color: c.ink2 }]} numberOfLines={1}>
          {m.label}
        </Text>
        <Pressable onPress={onPlace} disabled={!onPlace} style={styles.mid} accessibilityRole="button" hitSlop={6}>
          <Text style={[serif(lang, 700), styles.center, { color: c.ink }]}>
            {onPlace ? <Text style={{ fontSize: 9 }}>▼ </Text> : null}
            {m.dateline}
          </Text>
        </Pressable>
        <Text style={[serif(lang), styles.side, styles.right, { color: c.ink2 }]} numberOfLines={1}>
          {m.time}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { paddingTop: 6 },
  logo: { alignItems: 'center', paddingBottom: 10 },
  dateline: { flexDirection: 'row', alignItems: 'center', borderTopWidth: 1, borderBottomWidth: 1, paddingVertical: 5, gap: 8 },
  side: { flex: 1, fontSize: 9.5, letterSpacing: 0.2 },
  right: { textAlign: 'right' },
  mid: { flexShrink: 1, maxWidth: '64%' },
  center: { fontSize: 11, letterSpacing: 0.6, textAlign: 'center' },
});
