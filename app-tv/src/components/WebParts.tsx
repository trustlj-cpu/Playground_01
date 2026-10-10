// Front-page typography and blocks copied from the web (edition <style> + site/nyt.css overrides), one
// component per web class. Values in comments are the web CSS; every size goes through tv/web.ts.
import React from 'react';
import { Platform, Text, View, type TextStyle } from 'react-native';
import { useColors } from '../settings';
import { parseHTML, plain, type HNode } from '../shared/html';
import { linkTerms } from '../shared/terms';
import { isCJK, para, paraProps, sans, serif } from '../shared/theme';
import type { Block, GlossEntry } from '../shared/types';
import { useWeb } from '../tv/web';

export function kickText(k: string) {
  return (k || '').split(' · ')[0];
}

/** text-indent:1em for every paragraph but the first (RN Text has no text-indent) */
export const indent = (lang: string) => (isCJK(lang) ? '　' : ' ');

/** Glossary terms on the page: dotted red underline (nyt.css .term), first occurrence per story. */
export function Termed({ text, glossary, used, style, lines, lang }: { text: string; glossary?: Record<string, GlossEntry>; used?: Set<string>; style: any; lines?: number; lang?: string }) {
  const c = useColors();
  const segs = glossary ? linkTerms(text, glossary, used || new Set()) : [{ t: text }];
  return (
    <Text style={style} numberOfLines={lines} {...(lang ? paraProps(lang) : {})}>
      {segs.map((s, i) =>
        s.term ? (
          <Text key={i} style={{ textDecorationLine: 'underline', textDecorationStyle: Platform.OS === 'android' ? 'solid' : 'dotted', textDecorationColor: c.red }}>
            {s.t}
          </Text>
        ) : (
          <React.Fragment key={i}>{s.t}</React.Fragment>
        ),
      )}
    </Text>
  );
}

/** .kick — "국제·인권" + grey note "보도 대조 ✓ 매체 6곳 · …", 1 px ink rule under it */
export function Kick({ kick, lang, plain }: { kick: string; lang: string; /** popup kick: one run, no grey note (edition script open()) */ plain?: boolean }) {
  const c = useColors();
  const w = useWeb();
  const [main, ...rest] = plain ? [kick || ''] : (kick || '').split(' · ');
  const f = w.fs(10.5);
  return (
    <View style={{ borderBottomWidth: w.hair, borderBottomColor: c.ink, paddingBottom: w.px(2), marginBottom: w.px(4) }}>
      <Text style={[sans(700), { fontSize: f, letterSpacing: w.ls(0.14, f), color: c.ink }]} numberOfLines={2}>
        {main.toUpperCase()}
        {rest.length > 0 && <Text style={[sans(400), { color: c.mute, letterSpacing: w.ls(0.04, f) }]}>{'  ' + rest.join(' · ')}</Text>}
      </Text>
    </View>
  );
}

/** h2.hl (lead) / h3.hl: serif 700, letter-spacing −.025em; at a 960 px window h2 = 3.1vw, h3 = 2.2vw */
export function hlStyle(w: ReturnType<typeof useWeb>, lang: string, big: boolean, head: string): TextStyle[] {
  const f = w.fs(big ? 29.76 : 21.12);
  return [serif(lang, 700), { fontSize: f, lineHeight: f * (big ? 1.15 : 1.22), letterSpacing: w.ls(-0.025, f), color: head, marginTop: w.px(6), marginBottom: w.px(big ? 8 : 6) }];
}

/** .deck: sans 15px/1.5, ink-2, letter-spacing −.01em, margin 0 0 10px */
export function deckStyle(w: ReturnType<typeof useWeb>, lang: string, ink2: string): TextStyle[] {
  const f = w.fs(15);
  return [sans(400), para(lang), { fontSize: f, lineHeight: f * 1.5, letterSpacing: w.ls(-0.01, f), color: ink2, marginBottom: w.px(10) }];
}

/** .body / .one: serif 13.5px/1.6, letter-spacing −.015em, justified, paragraphs indented 1em but the first */
export function bodyStyle(w: ReturnType<typeof useWeb>, lang: string, ink: string): TextStyle[] {
  const f = w.fs(13.5);
  return [serif(lang), para(lang), { fontSize: f, lineHeight: f * 1.6, letterSpacing: w.ls(-0.015, f), color: ink }];
}

export function Paras({ paras, lang, glossary, used, cols = 1 }: { paras: string[]; lang: string; glossary?: Record<string, GlossEntry>; used?: Set<string>; cols?: 1 | 2 }) {
  const c = useColors();
  const w = useWeb();
  const st = bodyStyle(w, lang, c.ink);
  const ind = indent(lang);
  const items = paras.map((p, i) => (i ? ind : '') + p);
  if (cols === 1)
    return (
      <View>
        {items.map((p, i) => (
          <Termed key={i} text={p} glossary={glossary} used={used} style={st} lang={lang} />
        ))}
      </View>
    );
  // .body{column-count:2;column-gap:22px;column-rule:1px solid var(--rule-2)} — RN has no CSS columns:
  // the text is split at the sentence end nearest the middle, then flows in two equal columns.
  const [a, b] = splitColumns(items);
  return (
    <View style={{ flexDirection: 'row' }}>
      <View style={{ flex: 1, paddingRight: w.px(11) }}>
        {a.map((p, i) => (
          <Termed key={i} text={p} glossary={glossary} used={used} style={st} lang={lang} />
        ))}
      </View>
      <View style={{ flex: 1, paddingLeft: w.px(11), borderLeftWidth: w.hair, borderLeftColor: c.rule2 }}>
        {b.map((p, i) => (
          <Termed key={i} text={p} glossary={glossary} used={used} style={st} lang={lang} />
        ))}
      </View>
    </View>
  );
}

/** Split paragraphs into two halves of about equal length, cutting at a sentence end near the middle. */
export function splitColumns(paras: string[]): [string[], string[]] {
  const total = paras.reduce((n, p) => n + p.length, 0);
  if (paras.length === 0) return [[], []];
  let acc = 0;
  for (let i = 0; i < paras.length; i++) {
    const p = paras[i];
    if (acc + p.length >= total / 2) {
      const want = total / 2 - acc;
      const ends = [...p.matchAll(/[.!?。！？다요]\)?["”’]?\s+|[.。]\)?\s*/g)].map((m) => (m.index ?? 0) + m[0].length).filter((x) => x > 0 && x < p.length);
      const cut = ends.length ? ends.reduce((best, x) => (Math.abs(x - want) < Math.abs(best - want) ? x : best), ends[0]) : -1;
      if (cut > 0 && Math.abs(cut - want) < p.length * 0.45) return [[...paras.slice(0, i), p.slice(0, cut).trimEnd()], [p.slice(cut).trimStart(), ...paras.slice(i + 1)]];
      return want > p.length / 2 ? [paras.slice(0, i + 1), paras.slice(i + 1)] : [paras.slice(0, i), paras.slice(i)];
    }
    acc += p.length;
  }
  return [paras, []];
}

const kids = (n: HNode): HNode[] => (n.k === 'el' ? n.children : []);
const els = (nodes: HNode[], tag?: string) => nodes.filter((n): n is Extract<HNode, { k: 'el' }> => n.k === 'el' && (!tag || n.tag === tag));
const txt = (nodes: HNode[]) => plain(nodes).replace(/\s+/g, ' ').trim();

/** A web .fill / .rumor / .next / briefs block, rendered with the web's markup rules. */
export function WebBlock({ block, lang }: { block: Block; lang: string }) {
  const c = useColors();
  const w = useWeb();
  const nodes = parseHTML(block.html);
  const h5 = (t?: string) =>
    t ? <Text style={[sans(700), { fontSize: w.fs(10.5), letterSpacing: w.ls(0.22, w.fs(10.5)), color: c.mute, marginBottom: w.px(8) }]}>{t}</Text> : null;
  // nyt.css: .rumor h4,.next h4{font:11.5px serif;letter-spacing:.14em;border-bottom:1px solid var(--ink);padding-bottom:3px;margin:0 0 6px}
  const h4 = (t?: string) =>
    t ? (
      <View style={{ borderBottomWidth: w.hair, borderBottomColor: c.ink, paddingBottom: w.px(3), marginBottom: w.px(6) }}>
        <Text style={[serif(lang, 700), { fontSize: w.fs(11.5), letterSpacing: w.ls(0.14, w.fs(11.5)), color: c.ink }]}>{t}</Text>
      </View>
    ) : null;
  const dotted = { borderBottomWidth: w.hair, borderStyle: 'dotted' as const, borderBottomColor: c.ink };
  const f135 = w.fs(13.5);
  const ps = els(nodes, 'p');

  if (block.type === 'nums') {
    // .nums{grid 3 cols;gap:8px} div{border-left:2px solid var(--ink);padding-left:9px} b{17px} span{sans 11px mute}
    return (
      <View>
        {h5(block.title)}
        <View style={{ flexDirection: 'row', gap: w.px(8) }}>
          {ps.map((p, i) => (
            <View key={i} style={{ flex: 1, borderLeftWidth: w.px(2), borderLeftColor: c.ink, paddingLeft: w.px(9) }}>
              <Text style={[serif(lang, 700), { fontSize: w.fs(17), lineHeight: w.fs(17) * 1.1, letterSpacing: w.ls(-0.02, w.fs(17)), color: c.head }]}>{txt(els(p.children, 'b').flatMap(kids))}</Text>
              <Text style={[sans(400), { fontSize: w.fs(11), lineHeight: w.fs(11) * 1.35, color: c.mute, marginTop: w.px(3) }]}>{txt(els(p.children, 'span').flatMap(kids))}</Text>
            </View>
          ))}
        </View>
      </View>
    );
  }
  const lis = els(els(nodes, 'ul').flatMap(kids), 'li');
  if (lis.length) {
    // .briefs li{13.5px/1.5;padding:7px 0;border-bottom:1px dotted var(--ink)} span{sans 11px mute;margin-left:6px}
    return (
      <View>
        {h5(block.title)}
        {lis.map((li, i) => (
          <Text key={i} style={[serif(lang), { fontSize: f135, lineHeight: f135 * 1.5, color: c.ink, paddingVertical: w.px(7) }, i < lis.length - 1 && dotted]}>
            {txt(li.children.filter((n) => !(n.k === 'el' && n.tag === 'span')))}
            <Text style={[sans(400), { fontSize: w.fs(11), color: c.mute }]}>{'  ' + txt(els(li.children, 'span').flatMap(kids))}</Text>
          </Text>
        ))}
      </View>
    );
  }
  if (block.type === 'fill' && els(nodes, 'b').length) {
    // .word b{16px} b i{sans 10.5px;letter-spacing:.14em;color:var(--red)→nyt ink-2;margin-left:7px} p{13px/1.55;ink-2}
    const b = els(nodes, 'b')[0];
    return (
      <View>
        {h5(block.title)}
        <Text style={[serif(lang, 700), { fontSize: w.fs(16), color: c.head }]}>
          {txt(b.children.filter((n) => !(n.k === 'el' && n.tag === 'i')))}
          <Text style={[sans(700), { fontSize: w.fs(10.5), letterSpacing: w.ls(0.14, w.fs(10.5)), color: c.ink2 }]}>{'  ' + txt(els(b.children, 'i').flatMap(kids))}</Text>
        </Text>
        {ps.map((p, i) => (
          <Text key={i} style={[serif(lang), para(lang), { fontSize: w.fs(13), lineHeight: w.fs(13) * 1.55, color: c.ink2, marginTop: w.px(5) }]} {...paraProps(lang)}>
            {txt(p.children)}
          </Text>
        ))}
      </View>
    );
  }
  if (block.type === 'rumor' || block.type === 'next') {
    const next = block.type === 'next';
    return (
      <View>
        {h4(block.title)}
        {ps.map((p, i) => {
          const b = txt(els(p.children, 'b').flatMap(kids));
          const sp = txt(els(p.children, 'span').flatMap(kids)) || txt(p.children.filter((n) => !(n.k === 'el' && n.tag === 'b')));
          return next ? (
            <View key={i} style={[{ flexDirection: 'row', gap: w.px(12), paddingVertical: w.px(7) }, i < ps.length - 1 && dotted]}>
              <Text style={[serif(lang, 700), { fontSize: f135, lineHeight: f135 * 1.55, color: c.ink }]}>{b}</Text>
              <Text style={[serif(lang), { flex: 1, fontSize: f135, lineHeight: f135 * 1.55, color: c.ink }]}>{sp}</Text>
            </View>
          ) : (
            <Text key={i} style={[serif(lang), para(lang), { fontSize: f135, lineHeight: f135 * 1.55, color: c.ink, paddingVertical: w.px(5) }, i < ps.length - 1 && dotted]} {...paraProps(lang)}>
              <Text style={{ fontWeight: '700' }}>{b}</Text> <Text style={[sans(400), { fontSize: w.fs(12), color: c.mute }]}>{sp}</Text>
            </Text>
          );
        })}
      </View>
    );
  }
  // anything else (one / strip / other): heading + plain paragraphs as .one
  return (
    <View>
      {h5(block.title)}
      <Paras paras={blockParas(block.html)} lang={lang} />
    </View>
  );
}

/** Block HTML → plain paragraphs (li / tr rows become their own lines). */
export function blockParas(html: string): string[] {
  const out: string[] = [];
  const walk = (nodes: HNode[]) => {
    let inline = '';
    const flush = () => {
      if (inline.trim()) out.push(inline.replace(/\s+/g, ' ').trim());
      inline = '';
    };
    for (const n of nodes) {
      if (n.k === 'text') inline += n.text;
      else if (n.tag === 'br') flush();
      else if (n.tag === 'li') {
        flush();
        out.push('• ' + txt(n.children));
      } else if (n.tag === 'tr') {
        flush();
        out.push(n.children.map((td) => (td.k === 'el' ? txt(td.children) : td.text.trim())).filter(Boolean).join('   ·   '));
      } else if (['p', 'ul', 'ol', 'table', 'div'].includes(n.tag)) {
        flush();
        walk(n.children);
      } else inline += plain(n.children);
    }
    flush();
  };
  walk(parseHTML(html));
  return out;
}
