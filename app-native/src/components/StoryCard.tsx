import React, { memo, useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { strings } from '../i18n';
import { articleKey, useBookmarks, webPath } from '../lib/bookmarks';
import { useColors, useSettings } from '../lib/settings';
import { linkTerms } from '../lib/terms';
import { isCJK, para, sans, serif } from '../lib/theme';
import type { Edition, Story } from '../lib/types';
import Kick from './Kick';
import { useOverlay } from './Overlay';
import RichText, { TermTap } from './RichText';

/** One front-page story: kicker, headline (lead story larger), dek, body. Tap → article sheet. */
function StoryCard({ edition, story, lead }: { edition: Edition; story: Story; lead: boolean }) {
  const c = useColors();
  const { settings } = useSettings();
  const { openArticle, showTerm } = useOverlay();
  const bm = useBookmarks();
  const s = settings.textScale;
  const lang = edition.lang;
  const key = articleKey(edition.region, edition.date, lang, story.id);
  const on = bm.hasArticle(key);
  const S = strings(lang);
  const indent = isCJK(lang) ? '\u3000' : '\u2003'; // 1em first-line indent (web: text-indent:1em)
  // index items ("briefly today") come without body text: set them like the web's index column
  const compact = !lead && !(story.body || []).length;

  // first occurrence per story (headline → dek → body)
  const segs = useMemo(() => {
    const used = new Set<string>();
    const g = edition.glossary;
    return {
      hl: linkTerms(story.hl, g, used),
      dek: linkTerms(story.dek, g, used),
      body: (story.body || []).map((p) => linkTerms(p, g, used)),
    };
  }, [edition, story]);

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
          lead
            ? { fontSize: 27 * Math.min(s, 1.15), lineHeight: 27 * Math.min(s, 1.15) * 1.17, letterSpacing: -0.6 }
            : compact
              ? { fontSize: 17 * s, lineHeight: 17 * s * 1.3, letterSpacing: -0.3 }
              : { fontSize: 20 * s, lineHeight: 20 * s * 1.25, letterSpacing: -0.4 },
          styles.hl,
          { color: c.head },
        ]}
      />
      {!!story.dek && (
        <RichText
          segs={segs.dek}
          onTerm={onTerm}
          style={[sans(400), { fontSize: (lead ? 16 : compact ? 13.5 : 15) * s, lineHeight: (lead ? 16 : compact ? 13.5 : 15) * s * 1.5, color: c.ink2 }, compact ? null : styles.dek]}
        />
      )}
      {segs.body.map((p, i) => (
        <RichText
          key={i}
          segs={i ? [{ t: indent }, ...p] : p}
          onTerm={onTerm}
          style={[serif(lang), { fontSize: 14.5 * s, lineHeight: 14.5 * s * 1.62, color: c.ink }, para(lang)]}
        />
      ))}
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
});
