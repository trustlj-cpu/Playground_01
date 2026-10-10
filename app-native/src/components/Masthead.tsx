import React, { useRef } from 'react';
import { Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';
import { setIntroTarget } from '../lib/introTarget';
import { useLayout } from '../lib/layout';
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
  const { width, cls, short } = useLayout();
  // web: min(330px, 84vw) on phones, min(300px, 36vw) on short landscape screens; a little larger on tablets, never giant
  const logoW = short ? Math.min(300, width * 0.36) : cls === 'phone' ? Math.min(330, width * 0.84) : cls === 'tablet' ? 350 : 390;
  const big = cls !== 'phone';
  // large OS text sizes: three items no longer fit on one line ("No…", "6:0…") — the place/date gets its own
  // line and edition no. / time share the next one; all three capped at 1.3× like other page chrome
  const { fontScale } = useWindowDimensions();
  const stacked = fontScale > 1.15;
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
  const center = (
    <Pressable onPress={onPlace} disabled={!onPlace} style={stacked ? styles.midStacked : styles.mid} accessibilityRole={onPlace ? 'button' : 'text'} hitSlop={6}>
      <Text style={[serif(lang, 700), styles.center, big && styles.centerL, { color: c.ink }]} maxFontSizeMultiplier={1.3}>
        {onPlace ? <Text style={{ fontSize: 9 }}>▼ </Text> : null}
        {m.dateline}
      </Text>
    </Pressable>
  );
  // market "ears" (closing quotes in the edition data): value in bold, then what it is — set as a quote line
  // under the dateline like the website's market tape
  const ears = (m.ears || []).filter(Boolean).slice(0, 4).map(splitEar);
  return (
    <View style={styles.wrap}>
      <View style={styles.logo}>
        <View ref={logoRef} onLayout={report} collapsable={false}>
          <Logo width={logoW} />
        </View>
      </View>
      <View style={[styles.dateline, stacked && styles.datelineStacked, { borderColor: c.ink }]}>
        {stacked ? center : null}
        <View style={stacked ? styles.sidesRow : styles.contents}>
          <Text style={[serif(lang), styles.side, big && styles.sideL, { color: c.ink2 }]} numberOfLines={1} maxFontSizeMultiplier={1.3}>
            {m.label}
          </Text>
          {stacked ? null : center}
          <Text style={[serif(lang), styles.side, big && styles.sideL, styles.right, { color: c.ink2 }]} numberOfLines={1} maxFontSizeMultiplier={1.3}>
            {m.time}
          </Text>
        </View>
      </View>
      {ears.length ? (
        <View style={[styles.ears, big && styles.earsRow, { borderBottomColor: c.rule2 }]}>
          {ears.map(([v, rest], i) => (
            <Text key={i} style={[serif(lang), styles.ear, big && styles.earL, { color: c.ink2 }]} maxFontSizeMultiplier={1.3}>
              <Text style={[serif(lang, 700), { color: c.ink }]}>{v}</Text>
              {rest ? '  ' + rest : ''}
            </Text>
          ))}
        </View>
      ) : null}
    </View>
  );
}

/** "6,625.93 코스피 · 10/8 종가 · −2.62%" → ["6,625.93", "코스피 · 10/8 종가 · −2.62%"] */
export function splitEar(t: string): [string, string] {
  const m = t.trim().match(/^(\S+)\s+(.*)$/);
  return m && /\d/.test(m[1]) ? [m[1], m[2]] : ['', t.trim()];
}

const styles = StyleSheet.create({
  wrap: { paddingTop: 6 },
  logo: { alignItems: 'center', paddingBottom: 10 },
  dateline: { borderTopWidth: 1, borderBottomWidth: 1, paddingVertical: 5 },
  datelineStacked: { gap: 3 },
  contents: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  sidesRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  midStacked: { alignSelf: 'center' },
  ears: { borderBottomWidth: 1, paddingVertical: 5, gap: 2 },
  earsRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 16 },
  ear: { fontSize: 11.5, lineHeight: 16, flexShrink: 1 },
  earL: { fontSize: 12 },
  side: { flex: 1, fontSize: 9.5, letterSpacing: 0.2 },
  sideL: { fontSize: 11 },
  centerL: { fontSize: 12.5 },
  right: { textAlign: 'right' },
  mid: { flexShrink: 1, maxWidth: '64%' },
  center: { fontSize: 11, letterSpacing: 0.6, textAlign: 'center' },
});
