// Opened story (the web's popup): what / why / for you / two views / DailyDrop's take / sources.
import React, { useMemo } from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';
import { popupLabels, strings } from '../i18n';
import { articleKey, useBookmarks, webPath } from '../lib/bookmarks';
import { useLayout, useTextScale } from '../lib/layout';
import { useColors } from '../lib/settings';
import { linkTerms } from '../lib/terms';
import { para, sans, serif } from '../lib/theme';
import type { Edition, Story } from '../lib/types';
import Kick from './Kick';
import { useOverlay } from './Overlay';
import RichText, { TermTap } from './RichText';

export default function ArticleView({ edition, story }: { edition: Edition; story: Story }) {
  const c = useColors();
  const { cls } = useLayout();
  const { showTerm } = useOverlay();
  const bm = useBookmarks();
  const s = useTextScale();
  const lang = edition.lang;
  const L = popupLabels(edition.region, lang);
  const S = strings(lang);
  const p = story.popup || {};
  const key = articleKey(edition.region, edition.date, lang, story.id);
  const on = bm.hasArticle(key);
  const justify = para(lang);

  // one term scope for the whole opened article (web: linkTerms(popBody))
  const segs = useMemo(() => {
    const used = new Set<string>();
    const g = edition.glossary;
    const f = (t?: string) => linkTerms(t || '', g, used);
    return { title: f(p.title || story.hl), what: f(p.what), why: f(p.why), me: f(p.me), a: f(p.a), b: f(p.b), say: f(p.say) };
  }, [edition, story, p]);

  const onTerm = (t: TermTap) => {
    const entry = edition.glossary[t.term];
    if (entry) showTerm({ term: t.term, entry, x: t.x, y: t.y, region: edition.region, lang, date: edition.date });
  };

  const body = [serif(lang), { fontSize: 14.5 * s, lineHeight: 14.5 * s * 1.65, color: c.ink }, justify];
  const lab = (t: string) => <Text style={[serif(lang, 700), styles.lab, { color: c.ink }]}>{t}</Text>;

  return (
    <View accessibilityLabel={p.title || story.hl}>
      <Kick
        kick={p.kick || story.kick}
        bookmark={{
          on,
          label: on ? S.account.bmOn : S.account.bm,
          onPress: () => bm.toggleArticle({ key, id: story.id, region: edition.region, lang, date: edition.date, no: edition.no, kick: story.kick, hl: story.hl, url: webPath(edition.url) }),
        }}
      />
      <RichText segs={segs.title} onTerm={onTerm} style={[serif(lang, 700), styles.title, cls !== 'phone' && styles.titleL, { color: c.head }]} />
      {!!p.what && (
        <>
          {lab(L.what)}
          <RichText segs={segs.what} onTerm={onTerm} style={body} selectable={Platform.OS !== 'web'} />
        </>
      )}
      {!!p.why && (
        <>
          {lab(L.why)}
          <RichText segs={segs.why} onTerm={onTerm} style={body} selectable={Platform.OS !== 'web'} />
        </>
      )}
      {!!p.me && (
        <>
          {lab(L.me)}
          <RichText segs={segs.me} onTerm={onTerm} style={body} selectable={Platform.OS !== 'web'} />
        </>
      )}
      {!!(p.a || p.b) && (
        <>
          {lab(L.two)}
          {[
            [L.a, segs.a],
            [L.b, segs.b],
          ].map(([name, sg], i) => (
            <View key={i} style={[styles.view, { borderTopColor: c.rule2 }]}>
              <Text style={[sans(700), styles.viewName, { color: c.mute }]}>{name as string}</Text>
              <RichText segs={sg as any} onTerm={onTerm} style={[serif(lang), { fontSize: 14 * s, lineHeight: 14 * s * 1.6, color: c.ink2 }, justify]} />
            </View>
          ))}
        </>
      )}
      {!!p.say && (
        <>
          {lab(L.say)}
          <View style={[styles.say, { borderLeftColor: c.ink }]}>
            <RichText segs={segs.say} onTerm={onTerm} style={[serif(lang), { fontSize: 16 * s, lineHeight: 16 * s * 1.65, color: c.ink }]} />
          </View>
        </>
      )}
      {!!p.src && (
        <Text style={[sans(400), styles.src, { color: c.mute, borderTopColor: c.rule2 }]} selectable={Platform.OS !== 'web'}>
          {L.src} · {p.src}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 26, lineHeight: 31, letterSpacing: -0.6, marginTop: 8, marginBottom: 6 },
  titleL: { fontSize: 30, lineHeight: 36 },
  lab: { fontSize: 11, letterSpacing: 1.6, marginTop: 18, marginBottom: 6 },
  view: { borderTopWidth: 1, paddingTop: 8, marginTop: 6, marginBottom: 6 },
  viewName: { fontSize: 11, letterSpacing: 2, marginBottom: 3 },
  say: { borderLeftWidth: 3, paddingLeft: 14, paddingVertical: 4, marginVertical: 4 },
  src: { fontSize: 12, lineHeight: 18, borderTopWidth: 1, paddingTop: 8, marginTop: 18 },
});
