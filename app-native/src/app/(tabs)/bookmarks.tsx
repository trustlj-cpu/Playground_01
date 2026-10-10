import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import BookmarkButton from '../../components/BookmarkButton';
import { splitKick } from '../../components/Kick';
import { useOverlay } from '../../components/Overlay';
import ScreenTitle, { formatDate } from '../../components/ScreenTitle';
import { fmt, strings } from '../../i18n';
import { getJSON, paths } from '../../lib/api';
import { ArticleBookmark, useBookmarks } from '../../lib/bookmarks';
import { useIndex } from '../../lib/content';
import { READ_MAX, useTextScale } from '../../lib/layout';
import { useSettings } from '../../lib/settings';
import { sans, serif } from '../../lib/theme';
import type { Edition } from '../../lib/types';

export default function Bookmarks() {
  const { settings, colors: c } = useSettings();
  const insets = useSafeAreaInsets();
  const bm = useBookmarks();
  const { openArticle } = useOverlay();
  const S = strings(settings.lang);
  const A = S.account;
  const [tab, setTab] = useState<'a' | 't'>('a');
  const [busy, setBusy] = useState<string | null>(null);
  const [failed, setFailed] = useState<string | null>(null);
  const s = useTextScale();
  const index = useIndex();
  // bookmarks synced from the website carry no edition number: look it up in the index
  const edNo = (b: ArticleBookmark) => b.no || index.data?.regions.find((r) => r.code === b.region)?.editions.find((e) => e.date === b.date)?.no || 0;

  const open = async (b: ArticleBookmark) => {
    setBusy(b.key);
    setFailed(null);
    try {
      const ed = await getJSON<Edition>(paths.edition(b.region, b.date, b.lang));
      const st = ed.stories.find((x) => x.id === b.id);
      if (st) openArticle(ed, st);
      else setFailed(b.key);
    } catch {
      setFailed(b.key);
    } finally {
      setBusy(null);
    }
  };

  const Seg = ({ id, label, n }: { id: 'a' | 't'; label: string; n: number }) => (
    <Pressable onPress={() => setTab(id)} style={[styles.seg, { borderColor: c.ink, backgroundColor: tab === id ? c.ink : 'transparent' }]} accessibilityRole="tab" accessibilityState={{ selected: tab === id }}>
      <Text style={[sans(600), { color: tab === id ? c.paper : c.ink, fontSize: 13, letterSpacing: 0.5 }]}>
        {label} {n ? `· ${n}` : ''}
      </Text>
    </Pressable>
  );

  return (
    <ScrollView style={{ flex: 1, backgroundColor: c.paper }} contentContainerStyle={{ paddingTop: insets.top, paddingHorizontal: 16, paddingBottom: 32, width: '100%', maxWidth: READ_MAX + 32, alignSelf: 'center' }}>
      <ScreenTitle title={S.app.bookmarks} lang={settings.lang} />
      <View style={styles.segs} accessibilityRole="tablist">
        <Seg id="a" label={A.tabArticles} n={bm.articles.length} />
        <Seg id="t" label={A.tabTerms} n={bm.terms.length} />
      </View>
      {tab === 'a' ? (
        bm.articles.length ? (
          bm.articles.map((b, i) => (
            <Pressable
              key={b.key}
              onPress={() => open(b)}
              style={({ pressed }) => [styles.item, i < bm.articles.length - 1 && { borderBottomColor: c.ink, borderBottomWidth: 1 }, pressed && { opacity: 0.6 }]}
            >
              <View style={styles.row}>
                <Text style={[sans(700), styles.kick, { color: c.ink }]} numberOfLines={1}>
                  {b.kick ? splitKick(b.kick)[0] : ''}
                  <Text style={[sans(400), { color: c.mute }]}>
                    {'  '}
                    {edNo(b) ? fmt(strings(b.lang).app.edNo, { n: edNo(b) }) + ' · ' : ''}
                    {formatDate(b.date, b.lang)}
                  </Text>
                </Text>
                <BookmarkButton on label={A.bmOn} onPress={() => bm.removeArticle(b.key)} />
              </View>
              <Text style={[serif(b.lang, 700), { fontSize: 18 * s, lineHeight: 18 * s * 1.3, color: c.head }]}>{b.hl}</Text>
              {busy === b.key && <Text style={[sans(400), styles.note, { color: c.mute }]}>{S.app.loading}</Text>}
              {failed === b.key && <Text style={[sans(400), styles.note, { color: c.red }]}>{S.app.notCached}</Text>}
            </Pressable>
          ))
        ) : (
          <Text style={[sans(400), styles.empty, { color: c.mute }]}>{A.emptyArticles}</Text>
        )
      ) : bm.terms.length ? (
        bm.terms.map((t, i) => (
          <View key={t.key} style={[styles.item, i < bm.terms.length - 1 && { borderBottomColor: c.ink, borderBottomWidth: 1 }]}>
            <View style={styles.row}>
              <Text style={[serif(t.lang, 700), { fontSize: 17, color: c.head, flexShrink: 1 }]}>{t.term}</Text>
              {!!t.f && <Text style={[sans(700), { fontSize: 10, letterSpacing: 1.8, color: c.red, marginLeft: 8 }]}>{t.f}</Text>}
              <View style={{ flex: 1 }} />
              <BookmarkButton on label={A.bmOn} onPress={() => bm.removeTerm(t.key)} />
            </View>
            <Text style={[serif(t.lang), { fontSize: 14 * s, lineHeight: 14 * s * 1.6, color: c.ink }]}>{t.d}</Text>
            {!!t.w && <Text style={[sans(400), { fontSize: 12.5 * s, lineHeight: 12.5 * s * 1.5, color: c.mute, marginTop: 4 }]}>{t.w}</Text>}
          </View>
        ))
      ) : (
        <Text style={[sans(400), styles.empty, { color: c.mute }]}>{A.emptyTerms}</Text>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  segs: { flexDirection: 'row', gap: 8, marginTop: 10, marginBottom: 6 },
  seg: { borderWidth: 1, paddingHorizontal: 14, paddingVertical: 7 },
  item: { paddingVertical: 12, borderStyle: 'dotted' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  kick: { flex: 1, fontSize: 10.5, letterSpacing: 1.2 },
  note: { fontSize: 12, marginTop: 4 },
  empty: { fontSize: 14, lineHeight: 21, paddingVertical: 24 },
});
