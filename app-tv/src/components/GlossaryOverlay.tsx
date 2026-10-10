// Definition card for a glossary term picked in the reader — the web's term tip (.tip: term + field,
// meaning, "in this story"), scaled. No close button: Back / Menu, OK again, or any direction (leaving
// the card — it has nothing else to focus) closes it and the reader cursor stays on the term.
import React from 'react';
import { Text, View } from 'react-native';
import { popupLabels } from '../shared/i18n';
import { para, paraProps, sans, serif } from '../shared/theme';
import type { GlossEntry } from '../shared/types';
import { useColors } from '../settings';
import FocusOwner from '../tv/FocusOwner';
import { useWeb } from '../tv/web';
import OverlayShell from './OverlayShell';

export default function GlossaryOverlay({ term, entry, lang, region, onClose }: { term: string; entry: GlossEntry; lang: string; region?: string; onClose: () => void }) {
  const c = useColors();
  const w = useWeb();
  const L = popupLabels(region || '', lang);
  const f = w.fs(13.5);
  return (
    <OverlayShell
      onClose={onClose}
      scrim="transparent" // the web's .tip floats over the open popup without a second scrim
      onKey={(k) => {
        if (k === 'up' || k === 'down' || k === 'left' || k === 'right') {
          onClose(); // a direction leaves the card
          return true;
        }
        return false; // select → the card's own onPress (closes); other keys ignored
      }}
    >
      {/* .tip{max-width:340px;border:1px solid var(--ink) (dark #3a352d);padding:12px 14px 10px;font:13.5px/1.55 sans} */}
      <FocusOwner onPress={onClose} testID="glossary-overlay" style={{ width: w.px(340), backgroundColor: c.popBg, borderWidth: w.hair, borderColor: c.popBorder, paddingTop: w.px(12), paddingHorizontal: w.px(14), paddingBottom: w.px(10) }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', gap: w.px(10), marginBottom: w.px(4) }}>
          <Text style={[serif(lang, 700), { fontSize: w.fs(15), letterSpacing: w.ls(-0.02, w.fs(15)), color: c.head, flexShrink: 1 }]}>{term}</Text>
          {!!entry.f && <Text style={[sans(700), { fontSize: w.fs(10), letterSpacing: w.ls(0.2, w.fs(10)), color: c.ink2 }]}>{entry.f}</Text>}
        </View>
        <Text style={[sans(400), { fontSize: f, lineHeight: f * 1.55, color: c.ink2 }]}>{entry.d}</Text>
        {!!entry.w && (
          // .tw{margin-top:6px;padding-top:6px;border-top:1px dotted var(--rule);font-size:12.5px;color:var(--mute)} b{red 700 → nyt ink-2}
          <View style={{ marginTop: w.px(6), paddingTop: w.px(6), borderTopWidth: w.hair, borderStyle: 'dotted', borderTopColor: c.rule }}>
            <Text style={[sans(400), para(lang), { fontSize: w.fs(12.5), lineHeight: w.fs(12.5) * 1.55, color: c.mute }]} {...paraProps(lang)}>
              <Text style={{ fontWeight: '700', color: c.ink2 }}>{L.here} </Text>
              {entry.w}
            </Text>
          </View>
        )}
      </FocusOwner>
    </OverlayShell>
  );
}
