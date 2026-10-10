// Article reader = the web's story popup (.ov + .pop, edition script open(id) + nyt.css), scaled:
// kick, headline, 무슨 일 / 왜 중요한가 / 나에게는, two views, DailyDrop's take, sources — over the dimmed
// front page. Remote: ▲▼ scroll, ◀▶ move a cursor over the dotted glossary terms, OK opens the term tip,
// Back closes. The reader root is the single native focus owner, so the D-pad never moves focus behind it.
import React, { useCallback, useMemo, useRef, useState } from 'react';
import { Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { blockParas, Kick, WebBlock } from '../components/WebParts';
import { popupLabels } from '../shared/i18n';
import { linkTerms, type Seg } from '../shared/terms';
import { para, paraProps, sans, serif } from '../shared/theme';
import type { Block, Edition, GlossEntry, Story } from '../shared/types';
import { tvStrings } from '../strings';
import { useColors } from '../settings';
import FocusOwner from '../tv/FocusOwner';
import FocusTrap from '../tv/FocusTrap';
import { useBack, useRemoteKeys } from '../tv/remote';
import { useWeb } from '../tv/web';

type TSeg = Seg & { ti?: number };
type Sec = { key: string; kind: 'title' | 'body' | 'views' | 'say' | 'src'; label?: string; segs: TSeg[]; cols?: { name: string; segs: TSeg[] }[] };

function TermText({ segs, active, style, lang }: { segs: TSeg[]; active: number; style: any; lang: string }) {
  const c = useColors();
  return (
    <Text style={style} {...paraProps(lang)}>
      {segs.map((s, i) =>
        s.ti != null ? (
          <Text
            key={i}
            style={
              s.ti === active
                ? { backgroundColor: c.red, color: c.paper, textDecorationLine: 'none' } // the remote's term cursor
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

/** Block HTML (nums / next / rumor …) → plain paragraphs (kept for callers of the old API). */
export const htmlParas = blockParas;

/** Where in a section (0…1) a term starts, by character offset — used to keep the cursor on screen. */
export function termFraction(sec: Sec, ti: number): number {
  const all = [sec.segs, ...(sec.cols || []).map((x) => x.segs)];
  let n = 0;
  let at = -1;
  for (const g of all)
    for (const s of g) {
      if (s.ti === ti) at = n;
      n += s.t.length;
    }
  return at < 0 || !n ? 0 : at / n;
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
  const w = useWeb();
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
      if (p.what) secs.push({ key: 'what', kind: 'body', label: L.what, segs: link(p.what) });
      if (p.why) secs.push({ key: 'why', kind: 'body', label: L.why, segs: link(p.why) });
      if (p.me) secs.push({ key: 'me', kind: 'body', label: L.me, segs: link(p.me) });
      if (!p.what && !p.why && !p.me) story.body.forEach((b, i) => secs.push({ key: 'b' + i, kind: 'body', segs: link(b) }));
      if (p.a || p.b) secs.push({ key: 'two', kind: 'views', label: L.two, segs: [], cols: [{ name: L.a, segs: link(p.a) }, { name: L.b, segs: link(p.b) }] });
      if (p.say) secs.push({ key: 'say', kind: 'say', label: L.say, segs: link(p.say) });
      if (p.src) secs.push({ key: 'src', kind: 'src', label: L.src, segs: [{ t: p.src }] });
    } else if (block?.title) secs.push({ key: 'title', kind: 'title', segs: [{ t: block.title }] });
    return { secs, terms };
  }, [edition, story, block, L]);

  const [active, setActive] = useState(-1);
  const scroll = useRef<ScrollView>(null);
  const y = useRef(0);
  const viewH = useRef(0);
  const contentH = useRef(0);
  const popY = useRef(0);
  const secY = useRef<Record<string, { y: number; h: number }>>({});
  const termSec = useMemo(() => {
    const m: Sec[] = [];
    for (const s of secs) for (const g of [s.segs, ...(s.cols || []).map((x) => x.segs)]) for (const t of g) if (t.ti != null) m[t.ti] = s;
    return m;
  }, [secs]);

  const scrollTo = useCallback((to: number) => {
    const max = Math.max(0, contentH.current - viewH.current);
    const v = Math.max(0, Math.min(max, to));
    y.current = v;
    scroll.current?.scrollTo({ y: v, animated: true });
  }, []);

  /** keep the term cursor inside the middle band of the screen (estimated line position within its section) */
  const reveal = (ti: number) => {
    const sec = termSec[ti];
    const box = sec && secY.current[sec.key];
    if (!box) return;
    const ty = popY.current + box.y + box.h * termFraction(sec, ti);
    const top = y.current + viewH.current * 0.18;
    const bottom = y.current + viewH.current * 0.7;
    if (ty < top || ty > bottom) scrollTo(ty - viewH.current * 0.4);
  };

  const firstVisible = () => {
    for (let i = 0; i < terms.length; i++) {
      const sec = termSec[i];
      const box = sec && secY.current[sec.key];
      if (box && popY.current + box.y + box.h * termFraction(sec, i) >= y.current + viewH.current * 0.1) return i;
    }
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

  const popW = Math.min(w.px(820), w.CW);
  const fP = w.fs(13.5);
  const pStyle = [serif(lang), para(lang), { fontSize: fP, lineHeight: fP * 1.6, letterSpacing: w.ls(-0.015, fP), color: c.ink, marginBottom: w.px(6) }];
  // nyt.css .pop .lab{color:var(--ink);font-family:var(--serif);letter-spacing:.14em} edition: 11px 700, margin 16px 0 4px
  const lab = (t?: string) => (t ? <Text style={[serif(lang, 700), { fontSize: w.fs(11), letterSpacing: w.ls(0.14, w.fs(11)), color: c.ink, marginTop: w.px(16), marginBottom: w.px(4) }]}>{t}</Text> : null);
  const fH = w.fs(38.4); // .pop h2{font-size:clamp(26px,4vw,40px)} at 960 px
  const kick = story ? story.popup?.kick || story.kick : '';

  return (
    <View style={[StyleSheet.absoluteFill, { backgroundColor: c.scrim, zIndex: 400, elevation: 400 }]} testID="reader-ov">
      <FocusTrap style={StyleSheet.absoluteFill}>
        <FocusOwner autoFocus={!overlayOpen} onPress={onSelect} testID="reader" style={{ flex: 1 }}>
          <ScrollView
            ref={scroll}
            // the scroll area ends above the remote hint, which sits inside the 5% overscan-safe margin (T12)
            style={{ flex: 1, marginBottom: w.padY + w.fs(13) * 1.5 + w.px(8) }}
            scrollEnabled={Platform.OS === 'web'}
            showsVerticalScrollIndicator={false}
            onLayout={(e) => (viewH.current = e.nativeEvent.layout.height)}
            onContentSizeChange={(_, h) => (contentH.current = h)}
            onScroll={(e) => (y.current = e.nativeEvent.contentOffset.y)}
            scrollEventThrottle={32}
            // nyt.css .ov{padding:10vh 16px 18vh} — at least the 5% overscan margin
            contentContainerStyle={{ paddingTop: Math.max(w.H * 0.1, w.padY), paddingBottom: w.H * 0.08, paddingHorizontal: w.padX, alignItems: 'center' }}
          >
            {/* .pop{max-width:820px;border:1px solid (dark #3a352d);padding:22px 32px 26px;background:paper (dark paper-2)} */}
            <View
              testID="pop"
              onLayout={(e) => (popY.current = e.nativeEvent.layout.y)}
              style={{ width: popW, backgroundColor: c.popBg, borderWidth: w.hair, borderColor: c.popBorder, paddingTop: w.px(22), paddingHorizontal: w.px(32), paddingBottom: w.px(26), shadowColor: '#000', shadowOpacity: 0.3, shadowRadius: w.px(20), shadowOffset: { width: 0, height: w.px(12) } }}
            >
              {!!kick && <Kick kick={kick} lang={lang} plain />}
              {secs.map((s) => (
                <View key={s.key} onLayout={(e) => (secY.current[s.key] = { y: e.nativeEvent.layout.y, h: e.nativeEvent.layout.height })}>
                  {s.kind === 'title' ? (
                    <TermText lang={lang} segs={s.segs} active={active} style={[serif(lang, 700), { fontSize: fH, lineHeight: fH * 1.15, letterSpacing: w.ls(-0.025, fH), color: c.head, marginBottom: w.px(12) }]} />
                  ) : s.kind === 'views' ? (
                    <>
                      {lab(s.label)}
                      {/* .pop .vw{grid 2 cols;gap:18px} p{14px;ink-2;border-top:1px solid var(--rule);padding-top:8px} b{sans 11px;.18em;mute} */}
                      <View style={{ flexDirection: 'row', gap: w.px(18), marginVertical: w.px(6) }}>
                        {s.cols!.map((col, i) => (
                          <View key={i} style={{ flex: 1, borderTopWidth: w.hair, borderTopColor: c.rule, paddingTop: w.px(8) }}>
                            <Text style={[sans(700), { fontSize: w.fs(11), letterSpacing: w.ls(0.18, w.fs(11)), color: c.mute, marginBottom: w.px(3) }]}>{col.name}</Text>
                            <TermText lang={lang} segs={col.segs} active={active} style={[serif(lang), para(lang), { fontSize: w.fs(14), lineHeight: w.fs(14) * 1.6, color: c.ink2 }]} />
                          </View>
                        ))}
                      </View>
                    </>
                  ) : s.kind === 'say' ? (
                    <>
                      {lab(s.label)}
                      {/* .pop .say{border-left:3px solid var(--ink);padding:4px 0 4px 14px;margin:8px 0;font-size:16px;line-height:1.65} */}
                      <View style={{ borderLeftWidth: w.px(3), borderLeftColor: c.ink, paddingLeft: w.px(14), paddingVertical: w.px(4), marginVertical: w.px(8) }}>
                        <TermText lang={lang} segs={s.segs} active={active} style={[serif(lang), para(lang), { fontSize: w.fs(16), lineHeight: w.fs(16) * 1.65, color: c.ink }]} />
                      </View>
                    </>
                  ) : s.kind === 'src' ? (
                    // .pop .src{sans 12px/1.5 mute;border-top:1px solid var(--rule);padding-top:8px;margin-top:14px}
                    <Text style={[sans(400), { fontSize: w.fs(12), lineHeight: w.fs(12) * 1.5, color: c.mute, borderTopWidth: w.hair, borderTopColor: c.rule, paddingTop: w.px(8), marginTop: w.px(14) }]}>
                      {s.label} · {s.segs[0].t}
                    </Text>
                  ) : (
                    <>
                      {lab(s.label)}
                      <TermText lang={lang} segs={s.segs} active={active} style={pStyle} />
                    </>
                  )}
                </View>
              ))}
              {block && (
                <View style={{ marginTop: w.px(6) }}>
                  <WebBlock block={{ ...block, title: undefined }} lang={lang} />
                </View>
              )}
            </View>
          </ScrollView>
          {/* remote hint: the web's .mute text, inside the overscan-safe area */}
          <View pointerEvents="none" style={{ position: 'absolute', left: w.padX, right: w.padX, bottom: w.padY, flexDirection: 'row', justifyContent: 'space-between' }}>
            <Text style={[sans(400), { fontSize: w.fs(13), color: c.dark ? c.ink2 : c.paper }]}>{terms.length ? T.readerHint : T.readerHintNoTerms}</Text>
            {!!terms.length && (
              <Text style={[sans(400), { fontSize: w.fs(13), color: active >= 0 ? (c.dark ? c.red : c.paper) : c.dark ? c.mute : c.paper }]}>
                {active >= 0 ? `${terms[active]}  ${active + 1}/${terms.length}` : T.termHint.replace('{n}', String(terms.length))}
              </Text>
            )}
          </View>
        </FocusOwner>
      </FocusTrap>
    </View>
  );
}
