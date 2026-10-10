// Full breaking-news list, as the web's .brkl dialog (site/build.js BREAK): under the menu at the menu's
// width, "BREAKING · n" in red over a 1 px rule, newest first, dotted rules between items, source and time
// in small grey. Each item is focusable so the list scrolls with the remote; no close button (Back / Menu,
// or ◀ out of the list, closes it and focus returns to the ticker).
// Items come from the breaking store with stable keys (x.u): a poll that adds items keeps the focused one.
import React, { useState } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { useBreakingItems } from '../shared/breakingStore';
import { breakingLabel } from '../shared/i18n';
import { sans, serif } from '../shared/theme';
import { tvStrings } from '../strings';
import { useColors } from '../settings';
import Focusable from '../tv/Focusable';
import { useWeb } from '../tv/web';
import { metaLine, newestFirst } from './breaking';
import OverlayShell from './OverlayShell';

export default function BreakingOverlay({ lang, onClose }: { lang: string; onClose: () => void }) {
  const c = useColors();
  const w = useWeb();
  const items = useBreakingItems();
  const T = tvStrings(lang).tv;
  const list = newestFirst(items).filter((x, i, a) => a.findIndex((y) => y.u === x.u) === i);
  const [first] = useState(() => list[0]?.u); // initial focus only — new items arriving never steal it
  const ring = w.px(4) + Math.max(2, w.px(2)); // focus outline (offset + width) must not be clipped
  const navH = w.px(34);
  return (
    <OverlayShell
      onClose={onClose}
      scrim={c.scrim2}
      style={{ justifyContent: 'flex-start', paddingTop: w.padY + navH + w.px(8), paddingHorizontal: w.padX }}
      onKey={(k) => {
        if (k === 'left') {
          onClose();
          return true;
        }
        return false;
      }}
    >
      {/* .brkl .bp{background:var(--paper);border:1px solid var(--ink);padding:14px 16px 10px} */}
      <View testID="breaking-overlay" style={{ alignSelf: 'stretch', maxHeight: w.H - (w.padY + navH + w.px(8)) - w.padY, backgroundColor: c.paper, borderWidth: w.hair, borderColor: c.ink, paddingTop: w.px(14), paddingHorizontal: w.px(16), paddingBottom: w.px(10) }}>
        {/* .brkl h4{font:700 13px sans;letter-spacing:.06em;color:var(--red);border-bottom:1px solid var(--ink);padding-bottom:6px;margin:0 0 6px} */}
        <View style={{ borderBottomWidth: w.hair, borderBottomColor: c.ink, paddingBottom: w.px(6), marginBottom: w.px(6) }}>
          <Text style={[sans(700), { fontSize: w.fs(13), letterSpacing: w.ls(0.06, w.fs(13)), color: c.red }]}>
            {breakingLabel(lang)} · {list.length}
          </Text>
        </View>
        <ScrollView style={{ flexGrow: 0 }} contentContainerStyle={{ paddingHorizontal: ring, paddingVertical: ring }}>
          {list.length === 0 && <Text style={[serif(lang), { fontSize: w.fs(15), color: c.mute }]}>{T.breakingEmpty}</Text>}
          {list.map((x, i) => (
            <Focusable key={x.u} autoFocus={x.u === first} testID={'breaking-' + i}>
              {/* li{border-bottom:1px dotted var(--ink);padding:9px 0} a{600 15px/1.45 serif} small{12px/1.4 sans mute;margin-top:2px} */}
              <View style={[{ paddingVertical: w.px(9) }, i < list.length - 1 && { borderBottomWidth: w.hair, borderStyle: 'dotted', borderBottomColor: c.ink }]}>
                <Text style={[serif(lang, 700), { fontSize: w.fs(15), lineHeight: w.fs(15) * 1.45, color: c.ink }]}>{x.t}</Text>
                {!!metaLine(x, lang) && <Text style={[sans(400), { fontSize: w.fs(12), lineHeight: w.fs(12) * 1.4, marginTop: w.px(2), color: c.mute }]}>{metaLine(x, lang)}</Text>}
              </View>
            </Focusable>
          ))}
        </ScrollView>
      </View>
    </OverlayShell>
  );
}
