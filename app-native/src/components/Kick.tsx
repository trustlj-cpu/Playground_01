import React, { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useColors } from '../lib/settings';
import { sans } from '../lib/theme';
import BookmarkButton from './BookmarkButton';

const BTN = 36; // BookmarkButton box
export const KICK_MAX_SCALE = 1.3; // chrome-size text: grows with the OS text size, but only so far

/** Kicker line: section in bold ink, verification note in grey, thin rule under it; bookmark on the right,
 *  vertically centred on the kicker's FIRST line (owner rule) — also when a large OS text size wraps the
 *  kicker onto several lines. */
export default function Kick({ kick, bookmark }: { kick: string; bookmark?: { on: boolean; onPress: () => void; label: string } }) {
  const c = useColors();
  const [head, rest] = splitKick(kick);
  // centre of the first line (from the top of the row) once the kicker wraps; null while it is one line,
  // where plain centring is the same thing and keeps the row as tall as the button
  const [line1, setLine1] = useState<number | null>(null);
  return (
    <View style={styles.row}>
      <View style={[styles.kick, { borderBottomColor: c.ink }]}>
        <Text
          style={[sans(700), styles.text, { color: c.ink }]}
          maxFontSizeMultiplier={KICK_MAX_SCALE}
          onTextLayout={(e) => {
            const l = e.nativeEvent.lines[0];
            setLine1(l && e.nativeEvent.lines.length > 1 ? l.y + l.height / 2 : null);
          }}
        >
          {/[a-z]/.test(head) ? head.toUpperCase() : head}
          {!!rest && <Text style={[sans(400), { color: c.mute, letterSpacing: 0.4 }]}>{'  ' + rest}</Text>}
        </Text>
      </View>
      {bookmark ? (
        <View style={{ marginTop: line1 == null ? 0 : line1 - BTN / 2, alignSelf: line1 == null ? 'center' : 'flex-start' }}>
          <BookmarkButton {...bookmark} />
        </View>
      ) : null}
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
