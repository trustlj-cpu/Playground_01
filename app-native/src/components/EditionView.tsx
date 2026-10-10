import React from 'react';
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { strings } from '../i18n';
import { sans, serif } from '../lib/theme';
import { decodeEntities } from '../lib/html';
import { ColumnWidth, estText, GAP, masonry, splitContiguous, useLayout, useTextScale } from '../lib/layout';
import { useColors, useSettings } from '../lib/settings';
import type { Block, Edition, Story } from '../lib/types';
import BlockView from './BlockView';
import Columns from './Columns';
import BreakingBar from './BreakingBar';
import Influencers from './Influencers';
import Masthead from './Masthead';
import StoryCard, { estStory } from './StoryCard';

interface Props {
  edition: Edition;
  refreshing: boolean;
  onRefresh: () => void;
  offline?: boolean;
  breakingPath?: string | null;
  onPlace?: () => void;
  header?: React.ReactNode;
}

export default function EditionView({ edition, refreshing, onRefresh, offline, breakingPath, onPlace, header }: Props) {
  const c = useColors();
  const S = strings(edition.lang);
  const L = useLayout();
  const stories = edition.stories.slice().sort((a, b) => a.rank - b.rank);
  const blocks = edition.blocks || [];
  let inflAt = blocks.findIndex((b) => b.type === 'next');
  if (inflAt < 0) inflAt = blocks.findIndex((b) => b.type === 'glos' || b.type === 'colophon');
  if (inflAt < 0) inflAt = blocks.length;

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: c.paper }}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={c.mute} colors={[c.red]} progressBackgroundColor={c.paper2} />}
    >
      <View style={[styles.page, { maxWidth: L.pageW, paddingHorizontal: L.pad }]}>
        {header}
        <Masthead edition={edition} onPlace={onPlace} />
        {breakingPath ? <BreakingBar path={breakingPath} lang={edition.lang} /> : null}
        {offline ? <Text style={[sans(400), styles.offline, { color: c.mute }]}>{S.app.offline}</Text> : null}
        {L.cols === 1 ? (
          <>
            {stories.map((st, i) => (
              <View key={st.id} style={i ? [styles.rule, { borderTopColor: c.ink }] : null}>
                <StoryCard edition={edition} story={st} lead={i === 0} />
              </View>
            ))}
            <View style={[styles.rule, { borderTopColor: c.ink }]} />
            {blocks.map((b, i) => (
              <React.Fragment key={i}>
                {i === inflAt ? <Influencers items={edition.influencers || []} lang={edition.lang} /> : null}
                <BlockView block={b} lang={edition.lang} />
              </React.Fragment>
            ))}
            {inflAt >= blocks.length ? <Influencers items={edition.influencers || []} lang={edition.lang} /> : null}
          </>
        ) : (
          <Broadsheet edition={edition} stories={stories} blocks={blocks} inflAt={inflAt} />
        )}
        {!!edition.mast.house && (
          <Text style={[serif(edition.lang), styles.house, { color: c.ink, borderColor: c.ink }]}>{edition.mast.house}</Text>
        )}
      </View>
    </ScrollView>
  );
}

type Item = { key: string; h: number; node: React.ReactNode; story?: boolean };

const plainText = (html: string) => decodeEntities((html || '').replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ');

/** Tablet / wide page (web ≥600px): lead story across the top with its body in two text columns
 *  (on wide screens: lead over two of three columns + a right rail of the next stories), then the
 *  remaining stories in balanced columns, the index items ("briefly") in a band of columns, and the boxes. */
function Broadsheet({ edition, stories, blocks, inflAt }: { edition: Edition; stories: Story[]; blocks: Block[]; inflAt: number }) {
  const c = useColors();
  const { settings } = useSettings();
  const L = useLayout();
  const s = useTextScale();
  const us = settings.textScale;
  const lang = edition.lang;
  const { cols, colW, innerW, cls } = L;
  const [lead, ...rest] = stories;

  const storyItem = (st: Story, w: number): Item => ({
    key: st.id,
    h: estStory(st, w, cls, false, s, us),
    story: true,
    node: <StoryCard edition={edition} story={st} lead={false} />,
  });

  // ── top: lead (+ rail on wide screens)
  const leadW = cols === 3 ? 2 * colW + GAP : innerW;
  const leadCols = leadW >= 560 ? 2 : 1;
  const leadH = lead ? estStory(lead, leadW, cls, true, s, us, leadCols) : 0;
  const rail: Item[] = [];
  let k = 0;
  if (cols === 3) {
    let h = 0;
    for (; k < rest.length; k++) {
      const it = storyItem(rest[k], colW);
      if (rail.length && h + it.h > leadH * 1.08) break;
      rail.push(it);
      h += it.h;
    }
  }
  const after = rest.slice(k);
  const bodied = after.filter((st) => (st.body || []).length).map((st) => storyItem(st, colW));
  const index = after.filter((st) => !(st.body || []).length).map((st) => storyItem(st, colW));

  // ── boxes: influencers at the same place as on the phone; glossary note + colophon run full width at the end
  const boxes: Item[] = [];
  const tail: Block[] = [];
  const bh = (html: string, extra = 0) => 40 + extra + estText(plainText(html), colW, 13.5 * s, 13.5 * s * 1.55) + (html.match(/<(p|li|tr)\b/g) || []).length * 12;
  const infl = edition.influencers || [];
  const inflItem: Item = {
    key: 'infl',
    h: 40 + infl.reduce((h, i) => h + 18 + estText(`${i.who} ${i.where || ''} ${i.t}`, colW, 13.5 * s, 13.5 * s * 1.5), 0),
    node: <Influencers items={infl} lang={lang} />,
  };
  blocks.forEach((b, i) => {
    if (i === inflAt) boxes.push(inflItem);
    if (b.type === 'glos' || b.type === 'colophon') tail.push(b);
    else boxes.push({ key: 'b' + i, h: b.type === 'nums' ? 110 : bh(b.html), node: <BlockView block={b} lang={lang} /> });
  });
  if (inflAt >= blocks.length) boxes.push(inflItem);

  const widths = Array.from({ length: cols }, () => colW);
  const column = (items: Item[]) =>
    items.map((it, i) => (
      <View key={it.key} style={i && it.story ? [styles.rule, { borderTopColor: c.ink }] : null}>
        {it.node}
      </View>
    ));
  const section = (key: string, colsOf: Item[][], top = true) =>
    colsOf.some((x) => x.length) ? (
      <View key={key} style={top ? [styles.rule, { borderTopColor: c.ink }] : null}>
        <Columns widths={widths}>{colsOf.map(column)}</Columns>
      </View>
    ) : null;

  return (
    <>
      {lead ? (
        cols === 3 && rail.length ? (
          <Columns widths={[leadW, colW]}>
            {[<StoryCard key="lead" edition={edition} story={lead} lead textCols={leadCols} />, <View key="rail">{column(rail)}</View>]}
          </Columns>
        ) : (
          <ColumnWidth.Provider value={leadW}>
            <StoryCard edition={edition} story={lead} lead textCols={leadCols} />
          </ColumnWidth.Provider>
        )
      ) : null}
      {section('stories', masonry(bodied, cols, (x) => x.h))}
      {section('index', splitContiguous(index, cols, (x) => x.h))}
      <View style={[styles.rule, { borderTopColor: c.ink }]} />
      {section('boxes', masonry(boxes, cols, (x) => x.h), false)}
      {tail.map((b, i) => (
        <BlockView key={'t' + i} block={b} lang={lang} />
      ))}
    </>
  );
}

export function Loading({ lang }: { lang: string }) {
  const c = useColors();
  return (
    <View style={[styles.center, { backgroundColor: c.paper }]}>
      <ActivityIndicator color={c.mute} />
      <Text style={[sans(400), { color: c.mute, marginTop: 10, fontSize: 13 }]}>{strings(lang).app.loading}</Text>
    </View>
  );
}

export function Failed({ lang, onRetry, notCached }: { lang: string; onRetry: () => void; notCached?: boolean }) {
  const c = useColors();
  const A = strings(lang).app;
  return (
    <View style={[styles.center, { backgroundColor: c.paper }]}>
      <Text style={[serif(lang), { color: c.ink, fontSize: 15, textAlign: 'center', lineHeight: 22 }]}>{notCached ? A.notCached : A.loadFail}</Text>
      <Pressable onPress={onRetry} style={[styles.btn, { borderColor: c.ink }]} accessibilityRole="button">
        <Text style={[sans(600), { color: c.ink, letterSpacing: 1, fontSize: 13 }]}>{A.retry}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  content: { paddingBottom: 40 },
  page: { width: '100%', alignSelf: 'center' },
  rule: { borderTopWidth: 1 },
  offline: { fontSize: 11, textAlign: 'center', paddingTop: 6 },
  house: { marginTop: 14, borderWidth: 1, paddingVertical: 7, paddingHorizontal: 10, textAlign: 'center', fontStyle: 'italic', fontSize: 12, letterSpacing: 0.5 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  btn: { marginTop: 16, borderWidth: 1, paddingHorizontal: 22, paddingVertical: 10 },
});
