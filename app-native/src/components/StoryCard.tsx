import React, { memo, useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { strings } from '../i18n';
import { articleKey, useBookmarks, webPath } from '../lib/bookmarks';
import { estText, GAP, splitText, useColumnWidth, useLayout, useTextScale } from '../lib/layout';
import { useColors, useSettings } from '../lib/settings';
import { linkTerms } from '../lib/terms';
import { isCJK, para, sans, serif } from '../lib/theme';
import type { Edition, Story } from '../lib/types';
import Kick from './Kick';
import { useOverlay } from './Overlay';
import RichText, { TermTap } from './RichText';

/** Headline / dek / body type sizes for a story card (shared with the height estimate). */
export function storyType(cls: 'phone' | 'tablet' | 'wide', lead: boolean, compact: boolean, s: number, userScale: number) {
  const ls = Math.min(userScale, 1.15);
  const hl = lead ? (cls === 'wide' ? 37 : cls === 'tablet' ? 33 : 27) * ls : compact ? 17 * s : 20 * s;
  const hlLh = hl * (lead ? 1.17 : compact ? 1.3 : 1.25);
  const dek = (lead ? 16 : compact ? 13.5 : 15) * s;
  const body = 14.5 * s;
  return { hl, hlLh, dek, dekLh: dek * 1.5, body, bodyLh: body * 1.62 };
}

/** Rough height of a story card in a column `width` wide (for balancing columns). */
export function estStory(story: Story, width: number, cls: 'phone' | 'tablet' | 'wide', lead: boolean, s: number, userScale: number, textCols = 1): number {
  const compact = !lead && !(story.body || []).length;
  const t = storyType(cls, lead, compact, s, userScale);
  const bodyW = textCols > 1 ? (width - GAP * (textCols - 1)) / textCols : width;
  const body = (story.body || []).reduce((h, p) => h + estText(p, bodyW, t.body, t.bodyLh), 0) / textCols;
  return (compact ? 20 : 28) + 22 + estText(story.hl, width, t.hl, t.hlLh) + 12 + estText(story.dek || '', width, t.dek, t.dekLh) + (compact ? 0 : 10) + body;
}

/** One front-page story: kicker, headline (lead story larger), dek, body. Tap → article sheet.
 *  `textCols` = 2 sets the body in two text columns (the lead story on tablets and wide screens). */
function StoryCard({ edition, story, lead, textCols = 1 }: { edition: Edition; story: Story; lead: boolean; textCols?: number }) {
  const c = useColors();
  const { settings } = useSettings();
  const { openArticle, showTerm } = useOverlay();
  const bm = useBookmarks();
  const s = useTextScale();
  const { cls } = useLayout();
  const width = useColumnWidth();
  const lang = edition.lang;
  const key = articleKey(edition.region, edition.date, lang, story.id);
  const on = bm.hasArticle(key);
  const S = strings(lang);
  const indent = isCJK(lang) ? '\u3000' : '\u2003'; // 1em first-line indent (web: text-indent:1em)
  // index items ("briefly today") come without body text: set them like the web's index column
  const compact = !lead && !(story.body || []).length;
  const t = storyType(cls, lead, compact, s, settings.textScale);
  const split = textCols > 1 && (story.body || []).length > 0;

  // first occurrence per story (headline → dek → body)
  const segs = useMemo(() => {
    const used = new Set<string>();
    const g = edition.glossary;
    const hl = linkTerms(story.hl, g, used);
    const dek = linkTerms(story.dek, g, used);
    const cols = split ? splitText(story.body || []) : [(story.body || []).map((text) => ({ text, cont: false }))];
    const body = cols.map((col, ci) => col.map((p, i) => ({ segs: linkTerms(p.text, g, used), indent: !p.cont && (ci > 0 || i > 0) })));
    return { hl, dek, body };
  }, [edition, story, split]);

  const onTerm = (t: TermTap) => {
    const entry = edition.glossary[t.term];
    if (entry) showTerm({ term: t.term, entry, x: t.x, y: t.y, region: edition.region, lang, date: edition.date });
  };

  return (
    <Pressable
      onPress={() => openArticle(edition, story)}
      accessibilityRole="button"
      accessibilityHint={story.hl}
      style={({ pressed }) => [styles.card, compact && styles.compact, pressed && { backgroundColor: c.dark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.025)' }]}
    >
      <Kick
        kick={story.kick}
        bookmark={{
          on,
          label: on ? S.account.bmOn : S.account.bm,
          onPress: () => bm.toggleArticle({ key, id: story.id, region: edition.region, lang, date: edition.date, no: edition.no, kick: story.kick, hl: story.hl, url: webPath(edition.url) }),
        }}
      />
      <RichText
        segs={segs.hl}
        onTerm={onTerm}
        style={[
          serif(lang, 700),
          { fontSize: t.hl, lineHeight: t.hlLh, letterSpacing: lead ? -0.6 : compact ? -0.3 : -0.4 },
          styles.hl,
          { color: c.head },
        ]}
      />
      {!!story.dek && (
        <RichText
          segs={segs.dek}
          onTerm={onTerm}
          style={[sans(400), { fontSize: t.dek, lineHeight: t.dekLh, color: c.ink2 }, compact ? null : styles.dek, lead && cls !== 'phone' ? { maxWidth: 680 } : null]}
        />
      )}
      {split ? (
        <View style={styles.textCols}>
          {segs.body.map((col, ci) => (
            <React.Fragment key={ci}>
              {ci ? (
                <View style={styles.gap}>
                  <View style={[styles.vr, { backgroundColor: c.rule2 }]} />
                </View>
              ) : null}
              <View style={{ width: (width - GAP * (segs.body.length - 1)) / segs.body.length }}>
                {col.map((p, i) => (
                  <RichText key={i} segs={p.indent ? [{ t: indent }, ...p.segs] : p.segs} onTerm={onTerm} style={[serif(lang), { fontSize: t.body, lineHeight: t.bodyLh, color: c.ink }, para(lang)]} />
                ))}
              </View>
            </React.Fragment>
          ))}
        </View>
      ) : (
        segs.body[0].map((p, i) => (
          <RichText key={i} segs={p.indent ? [{ t: indent }, ...p.segs] : p.segs} onTerm={onTerm} style={[serif(lang), { fontSize: t.body, lineHeight: t.bodyLh, color: c.ink }, para(lang)]} />
        ))
      )}
    </Pressable>
  );
}

export default memo(StoryCard);

export function SectionRule() {
  const c = useColors();
  return <View style={{ height: 1, backgroundColor: c.ink, marginVertical: 2 }} />;
}

export function SmallNote({ children }: { children: React.ReactNode }) {
  const c = useColors();
  return <Text style={[sans(400), { fontSize: 11, color: c.mute, textAlign: 'center', paddingVertical: 4 }]}>{children}</Text>;
}

const styles = StyleSheet.create({
  card: { paddingVertical: 14 },
  compact: { paddingVertical: 10 },
  hl: { marginTop: 6, marginBottom: 6 },
  dek: { marginBottom: 10 },
  textCols: { flexDirection: 'row', alignItems: 'stretch' },
  gap: { width: GAP, alignItems: 'center' },
  vr: { flex: 1, width: 1 },
});
