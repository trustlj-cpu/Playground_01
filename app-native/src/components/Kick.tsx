import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useColors } from '../lib/settings';
import { sans } from '../lib/theme';
import BookmarkButton from './BookmarkButton';

/** Kicker line: section in bold ink, verification note in grey, thin rule under it; bookmark on the right,
 *  vertically centred on the kicker line (owner rule). */
export default function Kick({ kick, bookmark }: { kick: string; bookmark?: { on: boolean; onPress: () => void; label: string } }) {
  const c = useColors();
  const [head, rest] = splitKick(kick);
  return (
    <View style={styles.row}>
      <View style={[styles.kick, { borderBottomColor: c.ink }]}>
        <Text style={[sans(700), styles.text, { color: c.ink }]}>
          {/[a-z]/.test(head) ? head.toUpperCase() : head}
          {!!rest && <Text style={[sans(400), { color: c.mute, letterSpacing: 0.4 }]}>{'  ' + rest}</Text>}
        </Text>
      </View>
      {bookmark ? <BookmarkButton {...bookmark} /> : null}
    </View>
  );
}

/** "Section · Sub · Press ✓ 6 outlets · note" → bold section part (everything before the first segment
 *  carrying the ✓ verification mark, or just the first segment) and the grey note. */
export function splitKick(kick: string): [string, string] {
  const parts = (kick || '').split(' · ');
  let k = parts.findIndex((p) => p.includes('✓'));
  if (k <= 0) k = 1;
  return [parts.slice(0, k).join(' · '), parts.slice(k).join(' · ')];
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  kick: { flexShrink: 1, borderBottomWidth: 1, paddingBottom: 2, marginRight: 'auto' },
  text: { fontSize: 10.5, letterSpacing: 1.4, lineHeight: 16 },
});
