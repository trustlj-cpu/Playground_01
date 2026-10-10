// Full breaking-news list (from the ticker): newest first, each item focusable so the list scrolls with the remote.
import React from 'react';
import { ScrollView, Text, View } from 'react-native';
import { breakingLabel } from '../shared/i18n';
import { sans, serif } from '../shared/theme';
import type { BreakingItem } from '../shared/types';
import { tvStrings } from '../strings';
import { useColors } from '../settings';
import Focusable from '../tv/Focusable';
import { useTV } from '../tv/scale';
import { metaLine, newestFirst } from './breaking';
import OverlayShell from './OverlayShell';

export default function BreakingOverlay({ items, lang, onClose }: { items: BreakingItem[]; lang: string; onClose: () => void }) {
  const c = useColors();
  const { u, H, padY, padX } = useTV();
  const T = tvStrings(lang).tv;
  const list = newestFirst(items);
  return (
    <OverlayShell onClose={onClose} align="right">
      <View testID="breaking-overlay" style={{ width: 900 * u, height: H - 2 * padY, marginRight: padX, backgroundColor: c.paper, borderRadius: 14 * u, paddingHorizontal: 44 * u, paddingTop: 40 * u, borderTopWidth: 8 * u, borderTopColor: c.red }}>
        <Text style={[sans(700), { fontSize: 28 * u, letterSpacing: 1.6 * u, color: c.red, marginBottom: 16 * u }]}>
          {breakingLabel(lang)} · {list.length}
        </Text>
        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingVertical: 12 * u, gap: 14 * u }}>
          {list.length === 0 && <Text style={[serif(lang), { fontSize: 28 * u, color: c.mute }]}>{T.breakingEmpty}</Text>}
          {list.map((x, i) => (
            <Focusable key={x.u + i} autoFocus={i === 0} scale={1.02} radius={8 * u} style={{ padding: 20 * u, backgroundColor: c.paper2 }} testID={'breaking-' + i}>
              <Text style={[serif(lang, 700), { fontSize: 30 * u, lineHeight: 42 * u, color: c.ink }]}>{x.t}</Text>
              {!!metaLine(x, lang) && <Text style={[sans(400), { fontSize: 21 * u, marginTop: 6 * u, color: c.mute }]}>{metaLine(x, lang)}</Text>}
            </Focusable>
          ))}
        </ScrollView>
        <Text style={[sans(400), { fontSize: 20 * u, color: c.mute, paddingVertical: 18 * u }]}>{T.readOnWeb}</Text>
      </View>
    </OverlayShell>
  );
}
