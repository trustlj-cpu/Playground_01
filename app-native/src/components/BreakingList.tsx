import React from 'react';
import { Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import { useColors } from '../lib/settings';
import { sans, serif } from '../lib/theme';
import type { BreakingItem } from '../lib/types';

export function ago(at?: string): string {
  const m = Math.round((Date.now() - Date.parse(at || '')) / 60000);
  if (!(m >= 0)) return '';
  return m < 60 ? m + 'm' : Math.floor(m / 60) + 'h';
}

export function when(at: string | undefined, lang: string): string {
  const d = at ? new Date(at) : null;
  if (!d || isNaN(+d)) return '';
  let t: string;
  try {
    t = d.toLocaleString(lang, { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  } catch {
    t = d.toISOString().slice(5, 16).replace('T', ' ');
  }
  return t + ' · ' + ago(at);
}

/** Same rule as the web list: newest first; internal "속보 검색" sources are not shown. */
export function metaLine(x: BreakingItem, lang: string): string {
  const src = /^속보 검색/.test(x.s || '') ? '' : x.s || '';
  return [src, when(x.at, lang)].filter(Boolean).join(' · ');
}

export default function BreakingList({ items, label, lang }: { items: BreakingItem[]; label: string; lang: string }) {
  const c = useColors();
  const list = items.slice().sort((a, b) => (Date.parse(b.at || '') || 0) - (Date.parse(a.at || '') || 0));
  return (
    <View>
      <Text style={[sans(700), styles.h, { color: c.red, borderBottomColor: c.ink }]}>
        {label} · {list.length}
      </Text>
      {list.map((x, i) => (
        <Pressable
          key={x.u + i}
          onPress={() => Linking.openURL(x.u).catch(() => {})}
          style={({ pressed }) => [styles.li, i < list.length - 1 && { borderBottomColor: c.ink, borderBottomWidth: 1 }, pressed && { opacity: 0.6 }]}
          accessibilityRole="link"
        >
          <Text style={[serif(lang, 700), styles.t, { color: c.ink }]}>{x.t}</Text>
          {!!metaLine(x, lang) && <Text style={[sans(400), styles.meta, { color: c.mute }]}>{metaLine(x, lang)}</Text>}
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  h: { fontSize: 13, letterSpacing: 0.8, borderBottomWidth: 1, paddingBottom: 6, marginBottom: 2 },
  li: { paddingVertical: 9, borderStyle: 'dotted' },
  t: { fontSize: 15, lineHeight: 22 },
  meta: { fontSize: 12, lineHeight: 17, marginTop: 2 },
});
