// Masthead: wordmark, then edition No. · dateline · 06:00 local time between two rules (as on the web / phone app).
import React, { useRef } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useColors } from '../settings';
import { setIntroTarget } from '../shared/introTarget';
import { serif } from '../shared/theme';
import type { Edition } from '../shared/types';
import { useTV } from '../tv/scale';
import Logo from './Logo';

export const MAST_LOGO_W = 440;

export default function Masthead({ edition }: { edition: Edition }) {
  const c = useColors();
  const { u } = useTV();
  const lang = edition.lang;
  const m = edition.mast;
  const ears = (m.ears || []).filter((e) => typeof e === 'string');
  const logoRef = useRef<View>(null);
  // the opening animation rises into this wordmark
  const report = () =>
    setIntroTarget(
      () =>
        new Promise((done) => {
          const v = logoRef.current;
          if (!v) return done(null);
          v.measureInWindow((x, y, w, h) => done(w > 0 ? { x, y, width: w, height: h } : null));
        }),
    );
  const side = [serif(lang), { fontSize: 22 * u, color: c.ink2, flex: 1 }];
  return (
    <View>
      <View style={{ flexDirection: 'row', alignItems: 'center', paddingBottom: 14 * u }}>
        <Ear text={ears[0]} lang={lang} align="left" />
        <View ref={logoRef} onLayout={report} collapsable={false} style={{ marginHorizontal: 30 * u }}>
          <Logo width={MAST_LOGO_W * u} />
        </View>
        <Ear text={ears[1]} lang={lang} align="right" />
      </View>
      <View style={[styles.dateline, { borderColor: c.rule, paddingVertical: 8 * u, gap: 16 * u, borderTopWidth: Math.max(1, 2 * u), borderBottomWidth: Math.max(1, 2 * u) }]}>
        <Text style={side} numberOfLines={1}>
          {m.label}
        </Text>
        <Text style={[serif(lang, 700), { fontSize: 24 * u, letterSpacing: 1 * u, color: c.ink, textAlign: 'center', flexShrink: 1 }]} numberOfLines={1}>
          {m.dateline}
        </Text>
        <Text style={[side, { textAlign: 'right' }]} numberOfLines={1}>
          {m.time}
        </Text>
      </View>
    </View>
  );
}

/** Market "ears" beside the wordmark (e.g. KOSPI close, KRW/USD): figure first, detail below, as on the web. */
function Ear({ text, lang, align }: { text?: string; lang: string; align: 'left' | 'right' }) {
  const c = useColors();
  const { u } = useTV();
  if (!text) return <View style={{ flex: 1 }} />;
  const [head, ...rest] = text.split(' · ');
  return (
    <View style={{ flex: 1, alignItems: align === 'left' ? 'flex-start' : 'flex-end' }} testID={'ear-' + align}>
      <View style={{ borderTopWidth: Math.max(1, 2 * u), borderBottomWidth: Math.max(1, 2 * u), borderColor: c.rule2, paddingVertical: 8 * u, maxWidth: 520 * u }}>
        <Text style={[serif(lang, 700), { fontSize: 26 * u, color: c.ink, textAlign: align }]} numberOfLines={1}>
          {head}
        </Text>
        {!!rest.length && (
          <Text style={[serif(lang), { fontSize: 19 * u, lineHeight: 27 * u, color: c.mute, textAlign: align, marginTop: 4 * u }]} numberOfLines={2}>
            {rest.join(' · ')}
          </Text>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  dateline: { flexDirection: 'row', alignItems: 'center' },
});
