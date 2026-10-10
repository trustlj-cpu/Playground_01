import React, { useEffect, useMemo, useState } from 'react';
import { FlatList, RefreshControl, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import BookmarkButton from '../../components/BookmarkButton';
import { Failed, Loading } from '../../components/EditionView';
import ScreenTitle, { formatDate } from '../../components/ScreenTitle';
import { fmt, strings } from '../../i18n';
import { paths } from '../../lib/api';
import { termKey, useBookmarks } from '../../lib/bookmarks';
import { findRegion, pickLang, useIndex } from '../../lib/content';
import { READ_MAX, useTextScale } from '../../lib/layout';
import { useSettings } from '../../lib/settings';
import { sans, serif } from '../../lib/theme';
import type { GlossaryFile, GlossaryTerm } from '../../lib/types';
import { useResource } from '../../lib/useResource';

const norm = (s: string) => s.toLocaleLowerCase().normalize('NFKC');

export default function Glossary() {
  const { settings, colors: c } = useSettings();
  const insets = useSafeAreaInsets();
  const index = useIndex();
  const bm = useBookmarks();
  const region = findRegion(index.data, settings.region);
  const want = region ? pickLang(region, undefined, settings.lang) : settings.lang;
  // not every language has its own glossary file yet (e.g. zh-TW): fall back to English
  const [fallback, setFallback] = useState<string | null>(null);
  const lang = fallback && fallback.startsWith(want + '>') ? 'en' : want;
  const res = useResource<GlossaryFile>(paths.glossary(lang));
  useEffect(() => {
    if (res.error && !res.data && !res.loading && lang !== 'en' && (res.error as any).status === 404) setFallback(want + '>en');
  }, [res.error, res.data, res.loading, lang, want]);
  const S = strings(lang);
  const G = S.glossaryPage;
  const [q, setQ] = useState('');
  const [pulling, setPulling] = useState(false);
  const s = useTextScale();

  const list = useMemo(() => {
    const terms = res.data?.terms || [];
    const n = norm(q.trim());
    if (!n) return terms;
    return terms.filter((t) => norm(t.term).includes(n) || norm(t.f || '').includes(n) || norm(t.d || '').includes(n));
  }, [res.data, q]);

  if (!res.data) return res.error && !res.loading ? <Failed lang={lang} onRetry={res.refresh} notCached /> : <Loading lang={lang} />;

  const renderItem = ({ item }: { item: GlossaryTerm }) => {
    const key = termKey(lang, item.term);
    const on = bm.hasTerm(key);
    return (
      <View style={[styles.item, { borderBottomColor: c.ink }]}>
        <View style={styles.head}>
          <Text style={[serif(lang, 700), { fontSize: 17, color: c.head, flexShrink: 1 }]}>{item.term}</Text>
          {!!item.f && <Text style={[sans(700), styles.field, { color: c.red }]}>{item.f}</Text>}
          <View style={{ flex: 1 }} />
          <BookmarkButton
            on={on}
            label={on ? S.account.bmOn : S.account.bm}
            onPress={() => bm.toggleTerm({ key, term: item.term, f: item.f, d: item.d, w: item.w, region: item.region, lang, date: item.date })}
          />
        </View>
        <Text style={[serif(lang), { fontSize: 14 * s, lineHeight: 14 * s * 1.6, color: c.ink }]}>{item.d}</Text>
        {!!item.w && (
          <Text style={[sans(400), { fontSize: 12.5 * s, lineHeight: 12.5 * s * 1.5, color: c.mute, marginTop: 4 }]}>
            <Text style={[sans(700), { color: c.red }]}>{G.here} </Text>
            {item.w}
          </Text>
        )}
        <Text style={[sans(400), styles.meta, { color: c.mute }]}>
          {G.first} · {formatDate(item.date, lang)}
        </Text>
      </View>
    );
  };

  return (
    <View style={{ flex: 1, paddingTop: insets.top, backgroundColor: c.paper }}>
      <FlatList
        data={list}
        keyExtractor={(t) => t.term}
        renderItem={renderItem}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 32, width: '100%', maxWidth: READ_MAX + 32, alignSelf: 'center' }}
        initialNumToRender={15}
        refreshControl={
          <RefreshControl
            refreshing={pulling}
            onRefresh={async () => {
              setPulling(true);
              await res.refresh();
              setPulling(false);
            }}
            tintColor={c.mute}
            colors={[c.red]}
          />
        }
        ListHeaderComponent={
          <View>
            <ScreenTitle title={S.glossary} sub={G.intro ? fmt(G.intro, { n: res.data.terms.length }) : undefined} lang={lang} />
            <TextInput
              value={q}
              onChangeText={setQ}
              placeholder={G.search}
              placeholderTextColor={c.mute}
              autoCorrect={false}
              autoCapitalize="none"
              clearButtonMode="while-editing"
              returnKeyType="search"
              accessibilityLabel={G.search}
              style={[serif(lang), styles.search, { color: c.ink, borderColor: c.ink, backgroundColor: c.dark ? c.paper2 : 'rgba(255,255,255,0.35)' }]}
            />
          </View>
        }
        ListEmptyComponent={<Text style={[sans(400), { color: c.mute, paddingVertical: 24, textAlign: 'center' }]}>{G.none}</Text>}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  search: { borderWidth: 1, paddingHorizontal: 12, paddingVertical: 9, fontSize: 15, marginTop: 10, marginBottom: 6 },
  item: { paddingVertical: 12, borderBottomWidth: 1, borderStyle: 'dotted' },
  head: { flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 32 },
  field: { fontSize: 10, letterSpacing: 1.8 },
  meta: { fontSize: 11, marginTop: 6 },
});
