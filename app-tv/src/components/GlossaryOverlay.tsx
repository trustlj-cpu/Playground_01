// Definition card for a glossary term picked in the reader: term, field, meaning, why it matters here.
import React from 'react';
import { Text, View } from 'react-native';
import { sans, serif } from '../shared/theme';
import type { GlossEntry } from '../shared/types';
import { tvStrings } from '../strings';
import { useColors } from '../settings';
import Focusable from '../tv/Focusable';
import { useTV } from '../tv/scale';
import OverlayShell from './OverlayShell';

export default function GlossaryOverlay({ term, entry, lang, onClose }: { term: string; entry: GlossEntry; lang: string; onClose: () => void }) {
  const c = useColors();
  const { u } = useTV();
  const T = tvStrings(lang).tv;
  return (
    <OverlayShell onClose={onClose}>
      <View testID="glossary-overlay" style={{ width: 1080 * u, maxWidth: '86%', backgroundColor: c.paper, borderRadius: 14 * u, padding: 56 * u, borderTopWidth: 8 * u, borderTopColor: c.red }}>
        {!!entry.f && <Text style={[sans(700), { fontSize: 22 * u, letterSpacing: 1.6 * u, color: c.red, marginBottom: 12 * u }]}>{entry.f.toUpperCase()}</Text>}
        <Text style={[serif(lang, 700), { fontSize: 60 * u, lineHeight: 72 * u, color: c.head, marginBottom: 22 * u }]}>{term}</Text>
        <Text style={[serif(lang), { fontSize: 32 * u, lineHeight: 50 * u, color: c.ink }]}>{entry.d}</Text>
        {!!entry.w && (
          <View style={{ borderTopWidth: Math.max(1, 1.5 * u), borderTopColor: c.rule2, marginTop: 28 * u, paddingTop: 20 * u }}>
            <Text style={[sans(700), { fontSize: 20 * u, letterSpacing: 1.4 * u, color: c.mute, marginBottom: 8 * u }]}>{T.termWhy}</Text>
            <Text style={[serif(lang), { fontSize: 29 * u, lineHeight: 45 * u, color: c.ink2 }]}>{entry.w}</Text>
          </View>
        )}
        <View style={{ flexDirection: 'row', marginTop: 40 * u }}>
          <Focusable autoFocus onPress={onClose} radius={30 * u} style={{ paddingHorizontal: 34 * u, paddingVertical: 12 * u, backgroundColor: c.paper2 }} testID="overlay-close">
            <Text style={[sans(600), { fontSize: 26 * u, color: c.ink }]}>{T.close}</Text>
          </Focusable>
        </View>
      </View>
    </OverlayShell>
  );
}
