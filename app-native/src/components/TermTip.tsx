// Glossary tooltip card: term · field, definition, "in this story" note, bookmark.
// Closes by tapping anywhere outside it (no close button, like the web).
import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { termKey, useBookmarks } from '../lib/bookmarks';
import { TIP_MAX, useTextScale } from '../lib/layout';
import { useColors } from '../lib/settings';
import { sans, serif } from '../lib/theme';
import { popupLabels, strings } from '../i18n';
import BookmarkButton from './BookmarkButton';
import type { TermInfo } from './overlayContext';

export default function TermTip({ info, onClose }: { info: TermInfo; onClose: () => void }) {
  const c = useColors();
  const bm = useBookmarks();
  const { width: W, height: H } = useWindowDimensions();
  const [h, setH] = useState(0);
  const s = useTextScale();
  const w = Math.min(W >= 700 ? TIP_MAX : 340, W - 32);
  const left = Math.max(16, Math.min(info.x - 40, W - 16 - w));
  const below = info.y + 14;
  const top = h && below + h > H - 24 ? Math.max(16, info.y - 14 - h) : below;
  const L = popupLabels(info.region, info.lang);
  const key = termKey(info.term);
  const on = bm.hasTerm(key);
  const S = strings(info.lang);

  return (
    <>
      <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityRole="button" accessibilityLabel={strings(info.lang).app.close} />
      <View
        onLayout={(e) => setH(e.nativeEvent.layout.height)}
        style={[
          styles.card,
          { left, top, width: w, opacity: h ? 1 : 0, backgroundColor: c.dark ? c.paper2 : c.paper, borderColor: c.dark ? '#3a352d' : c.ink },
        ]}
        accessibilityRole="summary"
      >
        <View style={styles.head}>
          <Text style={[serif(info.lang, 700), { fontSize: 15, color: c.head, flexShrink: 1 }]}>{info.term}</Text>
          {!!info.entry.f && <Text style={[sans(700), styles.field, { color: c.red }]}>{info.entry.f}</Text>}
          <View style={{ flex: 1 }} />
          <BookmarkButton
            on={on}
            label={on ? S.account.bmOn : S.account.bm}
            onPress={() =>
              bm.toggleTerm({ key, term: info.term, f: info.entry.f, d: info.entry.d, w: info.entry.w, region: info.region, lang: info.lang, date: info.date })
            }
          />
        </View>
        <Text style={[sans(400), { fontSize: 13.5 * s, lineHeight: 13.5 * s * 1.55, color: c.ink2 }]}>{info.entry.d}</Text>
        {!!info.entry.w && (
          <View style={[styles.why, { borderTopColor: c.mute }]}>
            <Text style={[sans(400), { fontSize: 12.5 * s, lineHeight: 12.5 * s * 1.5, color: c.mute }]}>
              <Text style={[sans(700), { color: c.red }]}>{L.here} </Text>
              {info.entry.w}
            </Text>
          </View>
        )}
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  card: {
    position: 'absolute',
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingTop: 6,
    paddingBottom: 10,
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 15,
    shadowOffset: { width: 0, height: 6 },
    elevation: 12,
  },
  head: { flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 36 },
  field: { fontSize: 10, letterSpacing: 2 },
  why: { marginTop: 6, paddingTop: 6, borderTopWidth: 1, borderStyle: 'dotted' },
});
