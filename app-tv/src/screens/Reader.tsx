// Full-screen article reader (the web's story popup on a TV):
// kick, headline, what / why / for you / two views / DailyDrop's take / sources, ≥ 28 px body at 1080p.
// Remote: ▲▼ scroll, ◀▶ move a cursor over the underlined glossary terms, OK opens the definition, Back closes.
// The reader root is the single native focus owner, so the D-pad never moves focus behind it.
import React, { useCallback, useMemo, useRef, useState } from 'react';
import { Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { kickText } from '../components/StoryCard';
import { BLOCK_TAGS, parseHTML, plain, type HNode } from '../shared/html';
import { popupLabels } from '../shared/i18n';
import { linkTerms, type Seg } from '../shared/terms';
import { para, sans, serif } from '../shared/theme';
import type { Block, Edition, GlossEntry, Story } from '../shared/types';
import { tvStrings } from '../strings';
import { useColors } from '../settings';
import { useBack, useRemoteKeys } from '../tv/remote';
import { useTV } from '../tv/scale';
import FocusOwner from '../tv/FocusOwner';

type TSeg = Seg & { ti?: number };
type Sec = { key: string; kind: 'title' | 'body' | 'views' | 'say' | 'src' | 'dek'; label?: string; segs: TSeg[]; cols?: { name: string; segs: TSeg[] }[] };

function TermText({ segs, active, style }: { segs: TSeg[]; active: number; style: any }) {
  const c = useColors();
  return (
    <Text style={style}>
      {segs.map((s, i) =>
        s.ti != null ? (
          <Text
            key={i}
            style={
              s.ti === active
                ? { backgroundColor: c.red, color: c.paper, textDecorationLine: 'none' }
                : { textDecorationLine: 'underline', textDecorationStyle: Platform.OS === 'android' ? 'solid' : 'dotted', textDecorationColor: c.red }
            }
          >
            {s.t}
          </Text>
        ) : (
          <React.Fragment key={i}>{s.t}</React.Fragment>
        ),
      )}
    </Text>
  );
}

/** Block HTML (nums / next / rumor …) → plain paragraphs for the big screen. */
export function htmlParas(html: string): string[] {
  const out: string[] = [];
  let inline = '';
  const flush = () => {
    if (inline.trim()) out.push(inline.trim());
    inline = '';
  };
  const walk = (nodes: HNode[]) => {
    for (const n of nodes) {
      if (n.k === 'text') inline += n.text;
      else if (n.tag === 'br') inline += '\n';
      else if (n.tag === 'li') {
        flush();
        out.push('• ' + plain(n.children).trim());
      } else if (n.tag === 'tr') {
        flush();
        out.push(n.children.map((td) => (td.k === 'el' ? plain(td.children).trim() : td.text.trim())).filter(Boolean).join('   ·   '));
      } else if (BLOCK_TAGS.has(n.tag)) {
        flush();
        walk(n.children);
        flush();
      } else inline += plain(n.children);
    }
  };
  walk(parseHTML(html));
  flush();
  return out;
}

export default function Reader({
  edition,
  story,
  block,
  overlayOpen,
  onTerm,
  onClose,
}: {
  edition: Edition;
  story?: Story;
  block?: Block;
  overlayOpen: boolean;
  onTerm: (term: string, entry: GlossEntry) => void;
  onClose: () => void;
}) {
  const c = useColors();
  const { u, H, padX, padY } = useTV();
  const lang = edition.lang;
  const L = popupLabels(edition.region, lang);
  const T = tvStrings(lang).tv;

  const { secs, terms } = useMemo(() => {
    const used = new Set<string>();
    const terms: string[] = [];
    const link = (t?: string): TSeg[] =>
      linkTerms(t || '', story ? edition.glossary : undefined, used).map((s) => (s.term ? { ...s, ti: terms.push(s.term) - 1 } : s));
    const secs: Sec[] = [];
    if (story) {
      const p = story.popup || {};
      secs.push({ key: 'title', kind: 'title', segs: link(p.title || story.hl) });
      if (story.dek) secs.push({ key: 'dek', kind: 'dek', segs: [{ t: story.dek }] });
      if (p.what) secs.push({ key: 'what', kind: 'body', label: L.what, segs: link(p.what) });
      if (p.why) secs.push({ key: 'why', kind: 'body', label: L.why, segs: link(p.why) });
      if (p.me) secs.push({ key: 'me', kind: 'body', label: L.me, segs: link(p.me) });
      if (!p.what && !p.why && !p.me) story.body.forEach((b, i) => secs.push({ key: 'b' + i, kind: 'body', segs: link(b) }));
      if (p.a || p.b) secs.push({ key: 'two', kind: 'views', label: L.two, segs: [], cols: [{ name: L.a, segs: link(p.a) }, { name: L.b, segs: link(p.b) }] });
      if (p.say) secs.push({ key: 'say', kind: 'say', label: L.say, segs: link(p.say) });
      if (p.src) secs.push({ key: 'src', kind: 'src', label: L.src, segs: [{ t: p.src }] });
    } else if (block) {
      if (block.title) secs.push({ key: 'title', kind: 'title', segs: [{ t: block.title }] });
      htmlParas(block.html).forEach((t, i) => secs.push({ key: 'p' + i, kind: 'body', segs: [{ t }] }));
    }
    return { secs, terms };
  }, [edition, story, block, L]);

  const [active, setActive] = useState(-1);
  const scroll = useRef<ScrollView>(null);
  const y = useRef(0);
  const viewH = useRef(0);
  const contentH = useRef(0);
  const secY = useRef<Record<string, number>>({});
  const termSec = useMemo(() => {
    const m: string[] = [];
    for (const s of secs) for (const g of [s.segs, ...(s.cols || []).map((x) => x.segs)]) for (const t of g) if (t.ti != null) m[t.ti] = s.key;
    return m;
  }, [secs]);

  const scrollTo = useCallback((to: number) => {
    const max = Math.max(0, contentH.current - viewH.current);
    const v = Math.max(0, Math.min(max, to));
    y.current = v;
    scroll.current?.scrollTo({ y: v, animated: true });
  }, []);

  const reveal = (ti: number) => {
    const sy = secY.current[termSec[ti]];
    if (sy == null) return;
    if (sy < y.current + 20 * u || sy > y.current + viewH.current * 0.6) scrollTo(sy - 120 * u);
  };

  const firstVisible = () => {
    for (let i = 0; i < terms.length; i++) if ((secY.current[termSec[i]] ?? 0) >= y.current - 10) return i;
    return 0;
  };

  useRemoteKeys((k) => {
    const step = viewH.current * 0.55;
    if (k === 'up') scrollTo(y.current - step);
    else if (k === 'down') scrollTo(y.current + step);
    else if (k === 'right' && terms.length) {
      const n = active < 0 ? firstVisible() : Math.min(terms.length - 1, active + 1);
      setActive(n);
      reveal(n);
    } else if (k === 'left' && terms.length) {
      const n = active - 1;
      setActive(n);
      if (n >= 0) reveal(n);
    } else return false; // select → FocusOwner.onPress
    return true;
  }, !overlayOpen);

  useBack(() => {
    if (overlayOpen) return false;
    onClose();
    return true;
  });

  const onSelect = () => {
    if (!terms.length) return;
    let n = active;
    if (n < 0) {
      n = firstVisible();
      setActive(n);
      reveal(n);
    }
    const term = terms[n];
    const entry = edition.glossary[term];
    if (entry) onTerm(term, entry);
  };

  const colW = Math.min(1320 * u, 0.86 * 1920 * u);
  const body = [serif(lang), para(lang), { fontSize: 30 * u, lineHeight: 50 * u, color: c.ink }];
  const lab = (t?: string) => (t ? <Text style={[sans(700), { fontSize: 21 * u, letterSpacing: 2 * u, color: c.red, marginTop: 40 * u, marginBottom: 12 * u }]}>{t.toUpperCase()}</Text> : null);
  const kick = story ? kickText(story.popup?.kick || story.kick) : '';

  return (
    <FocusOwner autoFocus={!overlayOpen} onPress={onSelect} testID="reader" style={{ flex: 1, backgroundColor: c.paper }}>
      <ScrollView
        ref={scroll}
        style={{ flex: 1 }}
        scrollEnabled={Platform.OS === 'web'}
        showsVerticalScrollIndicator={false}
        onLayout={(e) => (viewH.current = e.nativeEvent.layout.height)}
        onContentSizeChange={(_, h) => (contentH.current = h)}
        onScroll={(e) => (y.current = e.nativeEvent.contentOffset.y)}
        scrollEventThrottle={32}
        contentContainerStyle={{ paddingTop: padY + 30 * u, paddingBottom: H * 0.4, paddingHorizontal: padX, alignItems: 'center' }}
      >
        <View style={{ width: colW }}>
          <Text style={[sans(700), { fontSize: 22 * u, letterSpacing: 1.8 * u, color: c.mute }]} numberOfLines={1}>
            {edition.mast.label} · {edition.mast.dateline}
          </Text>
          {!!kick && <Text style={[sans(700), { fontSize: 24 * u, letterSpacing: 1.6 * u, color: c.red, marginTop: 18 * u }]}>{kick.toUpperCase()}</Text>}
          {secs.map((s) => (
            <View key={s.key} onLayout={(e) => (secY.current[s.key] = e.nativeEvent.layout.y)}>
              {s.kind === 'title' ? (
                <TermText segs={s.segs} active={active} style={[serif(lang, 700), { fontSize: 58 * u, lineHeight: 72 * u, letterSpacing: -0.8 * u, color: c.head, marginTop: 14 * u }]} />
              ) : s.kind === 'dek' ? (
                <Text style={[serif(lang), { fontSize: 32 * u, lineHeight: 48 * u, color: c.ink2, marginTop: 18 * u, paddingBottom: 26 * u, borderBottomWidth: Math.max(1, 2 * u), borderBottomColor: c.rule }]}>{s.segs[0].t}</Text>
              ) : s.kind === 'views' ? (
                <>
                  {lab(s.label)}
                  <View style={{ flexDirection: 'row', gap: 40 * u }}>
                    {s.cols!.map((col, i) => (
                      <View key={i} style={{ flex: 1, borderTopWidth: Math.max(1, 2 * u), borderTopColor: c.rule2, paddingTop: 14 * u }}>
                        <Text style={[sans(700), { fontSize: 20 * u, letterSpacing: 2 * u, color: c.mute, marginBottom: 8 * u }]}>{col.name}</Text>
                        <TermText segs={col.segs} active={active} style={[serif(lang), { fontSize: 28 * u, lineHeight: 46 * u, color: c.ink2 }]} />
                      </View>
                    ))}
                  </View>
                </>
              ) : s.kind === 'say' ? (
                <>
                  {lab(s.label)}
                  <View style={{ borderLeftWidth: 6 * u, borderLeftColor: c.red, paddingLeft: 28 * u, paddingVertical: 6 * u }}>
                    <TermText segs={s.segs} active={active} style={[serif(lang), { fontSize: 33 * u, lineHeight: 54 * u, color: c.ink }]} />
                  </View>
                </>
              ) : s.kind === 'src' ? (
                <Text style={[sans(400), { fontSize: 22 * u, lineHeight: 34 * u, color: c.mute, borderTopWidth: Math.max(1, 1.5 * u), borderTopColor: c.rule2, paddingTop: 16 * u, marginTop: 44 * u }]}>
                  {s.label} · {s.segs[0].t}
                </Text>
              ) : (
                <>
                  {lab(s.label)}
                  <TermText segs={s.segs} active={active} style={[body, !s.label && { marginTop: 22 * u }]} />
                </>
              )}
            </View>
          ))}
        </View>
      </ScrollView>
      <View style={[styles.hint, { backgroundColor: c.paper2, borderTopColor: c.rule2, paddingHorizontal: padX, paddingTop: 14 * u, paddingBottom: Math.max(padY * 0.6, 14 * u) }]}>
        <Text style={[sans(600), { fontSize: 22 * u, color: c.ink2 }]}>{terms.length ? T.readerHint : T.readerHintNoTerms}</Text>
        {!!terms.length && (
          <Text style={[sans(400), { fontSize: 22 * u, color: active >= 0 ? c.red : c.mute }]}>
            {active >= 0 ? `${terms[active]}  ${active + 1}/${terms.length}` : T.termHint.replace('{n}', String(terms.length))}
          </Text>
        )}
      </View>
    </FocusOwner>
  );
}

const styles = StyleSheet.create({
  hint: { flexDirection: 'row', justifyContent: 'space-between', borderTopWidth: 1 },
});

