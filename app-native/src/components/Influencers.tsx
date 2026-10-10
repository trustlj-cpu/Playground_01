import React from 'react';
import { Linking, StyleSheet, Text, View } from 'react-native';
import { inflLabels } from '../i18n';
import { useColors, useSettings } from '../lib/settings';
import { sans, serif } from '../lib/theme';
import type { Influencer } from '../lib/types';
import { BoxTitle } from './BlockView';

/** Influencer watch box (web: INFL in build.js) — statements as posted, link to the original post. */
export default function Influencers({ items, lang }: { items: Influencer[]; lang: string }) {
  const c = useColors();
  const s = useSettings().settings.textScale;
  const [title, srcLabel, note] = inflLabels(lang);
  const list = items.filter((i) => i && i.who && /^https?:\/\//.test(i.u || '')).slice(0, 6);
  if (!list.length) return null;
  return (
    <View style={styles.box}>
      <BoxTitle title={title} lang={lang} />
      {list.map((i, k) => (
        <View key={k} style={[styles.li, k < list.length - 1 && { borderBottomWidth: 1, borderBottomColor: c.ink }]}>
          <Text style={[serif(lang), { fontSize: 13.5 * s, lineHeight: 13.5 * s * 1.5, color: c.ink }]}>
            <Text style={[serif(lang, 700)]}>{i.who}</Text>
            {'  '}
            <Text
              style={[sans(400), styles.meta, { color: c.mute, textDecorationColor: c.mute }]}
              onPress={() => Linking.openURL(i.u).catch(() => {})}
              accessibilityRole="link"
            >
              {[i.where, i.date].filter(Boolean).join(' · ') || srcLabel}
            </Text>
            {'\n'}
            {i.t}
          </Text>
        </View>
      ))}
      {!!note && <Text style={[sans(400), styles.note, { color: c.mute }]}>{note}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  box: { marginTop: 18 },
  li: { paddingVertical: 7, borderStyle: 'dotted' },
  meta: { fontSize: 11, textDecorationLine: 'underline', textDecorationStyle: 'dotted' },
  note: { fontSize: 11, marginTop: 6 },
});
