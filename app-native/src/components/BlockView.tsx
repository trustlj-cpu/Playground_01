// Native renderer for blocks[].html (no WebView). Block tags → Views, inline tags → nested Text.
import React, { useMemo } from 'react';
import { Linking, StyleSheet, Text, TextStyle, useWindowDimensions, View } from 'react-native';
import { HNode, isBlock, parseHTML, plain } from '../lib/html';
import { useColors, useSettings } from '../lib/settings';
import { Palette, sans, serif } from '../lib/theme';
import type { Block } from '../lib/types';

interface Ctx {
  width: number;
  c: Palette;
  lang: string;
  s: number;
  base: TextStyle;
}

function inlineStyle(tag: string, ctx: Ctx, parent?: string): TextStyle {
  const { c } = ctx;
  switch (tag) {
    case 'b':
    case 'strong':
      return { ...serif(ctx.lang, 700), color: c.ink };
    case 'i':
    case 'em':
      // "word of the day": <b>term<i>field</i></b> → small red label like the web
      return parent === 'b' ? { ...sans(700), fontSize: 10.5, letterSpacing: 1.5, color: c.red } : { fontStyle: 'italic' };
    case 'span':
      return { ...sans(400), fontSize: 12 * ctx.s, color: c.mute };
    case 'small':
      return { ...sans(400), fontSize: 11 * ctx.s, color: c.mute };
    case 'a':
      return { textDecorationLine: 'underline', textDecorationStyle: 'dotted', textDecorationColor: c.mute };
    default:
      return {};
  }
}

function Inline({ nodes, ctx, parent }: { nodes: HNode[]; ctx: Ctx; parent?: string }): React.ReactElement {
  return (
    <>
      {nodes.map((n, i) => {
        if (n.k === 'text') return <React.Fragment key={i}>{n.text}</React.Fragment>;
        if (n.tag === 'br') return <React.Fragment key={i}>{'\n'}</React.Fragment>;
        const st = inlineStyle(n.tag, ctx, parent);
        const prev = nodes[i - 1];
        const spaced = !prev || (prev.k === 'text' && /\s$/.test(prev.text));
        const pre = n.tag === 'span' && !spaced ? '  ' : n.tag === 'i' && parent === 'b' ? '  ' : '';
        return (
          <Text key={i} style={st} onPress={n.tag === 'a' && n.href ? () => Linking.openURL(n.href!).catch(() => {}) : undefined}>
            {pre}
            <Inline nodes={n.children} ctx={ctx} parent={n.tag} />
          </Text>
        );
      })}
    </>
  );
}

/** Renders a node list: consecutive inline nodes are grouped into one Text. */
function Flow({ nodes, ctx, textStyle }: { nodes: HNode[]; ctx: Ctx; textStyle?: TextStyle }) {
  const out: React.ReactNode[] = [];
  let run: HNode[] = [];
  const flush = () => {
    const meaningful = run.some((n) => n.k !== 'text' || n.text.trim());
    if (meaningful) {
      // trim leading/trailing whitespace of the run
      const r = run.slice();
      if (r[0]?.k === 'text') r[0] = { k: 'text', text: r[0].text.replace(/^\s+/, '') };
      const l = r.length - 1;
      if (r[l]?.k === 'text') r[l] = { k: 'text', text: (r[l] as any).text.replace(/\s+$/, '') };
      out.push(
        <Text key={out.length} style={[ctx.base, textStyle]}>
          <Inline nodes={r} ctx={ctx} />
        </Text>,
      );
    }
    run = [];
  };
  for (const n of nodes) {
    if (isBlock(n)) {
      flush();
      out.push(<BlockNode key={out.length} n={n as Extract<HNode, { k: 'el' }>} ctx={ctx} />);
    } else run.push(n);
  }
  flush();
  return <>{out}</>;
}

function BlockNode({ n, ctx }: { n: Extract<HNode, { k: 'el' }>; ctx: Ctx }) {
  const { c } = ctx;
  switch (n.tag) {
    case 'p':
      return (
        <View style={styles.p}>
          <Flow nodes={n.children} ctx={ctx} />
        </View>
      );
    case 'ul':
    case 'ol': {
      const lis = n.children.filter((x) => x.k === 'el' && x.tag === 'li') as Extract<HNode, { k: 'el' }>[];
      return (
        <View>
          {lis.map((li, i) => (
            <View key={i} style={[styles.li, i < lis.length - 1 && { borderBottomWidth: 1, borderBottomColor: c.ink }]}>
              <Flow nodes={li.children} ctx={ctx} />
            </View>
          ))}
        </View>
      );
    }
    case 'li':
      return (
        <View style={styles.li}>
          <Flow nodes={n.children} ctx={ctx} />
        </View>
      );
    case 'table':
    case 'tr': {
      const rows = n.tag === 'tr' ? [n] : (n.children.filter((x) => x.k === 'el' && x.tag === 'tr') as Extract<HNode, { k: 'el' }>[]);
      // label column like the web's grid `fit-content(32%) 1fr`: as wide as the longest label, at most 32%
      const longest = Math.max(0, ...rows.flatMap((r) => r.children.filter((x) => x.k === 'el' && x.tag === 'th').map((x) => ems(plain((x as any).children).trim()))));
      const thW = Math.min(ctx.width * 0.32, longest * 13.5 * ctx.s + 8);
      return (
        <View>
          {rows.map((r, i) => (
            <View key={i} style={[styles.tr, i < rows.length - 1 && { borderBottomWidth: 1, borderBottomColor: c.ink }]}>
              {(r.children.filter((x) => x.k === 'el') as Extract<HNode, { k: 'el' }>[]).map((cell, j) => (
                <View key={j} style={cell.tag === 'th' ? [styles.th, { width: thW }] : styles.td}>
                  <Flow nodes={cell.children} ctx={ctx} textStyle={cell.tag === 'th' ? { ...serif(ctx.lang, 700), color: c.ink } : undefined} />
                </View>
              ))}
            </View>
          ))}
        </View>
      );
    }
    default:
      return <Flow nodes={n.children} ctx={ctx} />;
  }
}

export function BoxTitle({ title, lang }: { title: string; lang: string }) {
  const c = useColors();
  return <Text style={[serif(lang, 700), styles.title, { color: c.ink, borderBottomColor: c.ink }]}>{title}</Text>;
}

export default function BlockView({ block, lang }: { block: Block; lang: string }) {
  const c = useColors();
  const { settings } = useSettings();
  const s = settings.textScale;
  const width = useWindowDimensions().width - 32;
  const nodes = useMemo(() => {
    const n = parseHTML(block.html);
    return block.type === 'next' ? asRows(n) : n;
  }, [block.html, block.type]);
  const base: TextStyle = { ...serif(lang), fontSize: 13.5 * s, lineHeight: 13.5 * s * 1.55, color: c.ink };

  if (block.type === 'glos') {
    return (
      <View style={styles.glos}>
        <Flow nodes={nodes} ctx={{ width, c, lang, s, base: { ...sans(400), fontSize: 11, lineHeight: 16, color: c.mute } }} />
      </View>
    );
  }
  if (block.type === 'colophon') {
    const ctx = { width, c, lang, s, base: { ...serif(lang), fontSize: 11, lineHeight: 16, color: c.ink2 } };
    return (
      <View style={[styles.colophon, { borderTopColor: c.ink }]}>
        <Flow nodes={nodes.map((n) => (n.k === 'el' && n.tag === 'span' ? { ...n, tag: 'p' } : n))} ctx={ctx} />
      </View>
    );
  }
  const ctx = { width, c, lang, s, base };
  return (
    <View style={[styles.block, block.type === 'nums' && styles.nums]}>
      {!!block.title && <BoxTitle title={block.title} lang={lang} />}
      {block.type === 'nums' ? <Nums nodes={nodes} ctx={ctx} /> : <Flow nodes={nodes} ctx={ctx} />}
    </View>
  );
}

type El = Extract<HNode, { k: 'el' }>;
/** rough text width in em: full-width (CJK) characters ≈ 1em, others ≈ 0.58em */
const ems = (t: string) => [...t].reduce((w, ch) => w + (/[\u1100-\u11ff\u2e80-\u9fff\uac00-\ud7af\uf900-\ufaff\uff00-\uffef]/.test(ch) ? 1.02 : 0.58), 0);
const els = (ns: HNode[]) => ns.filter((x) => !(x.k === 'text' && !x.text.trim()));

/** "What to watch": <p><b>label</b> <span>text</span></p> rows → a two-column table (web: grid fit-content(32%) 1fr). */
function asRows(nodes: HNode[]): HNode[] {
  const out: HNode[] = [];
  let table: El | null = null;
  for (const n of nodes) {
    const kids = n.k === 'el' && n.tag === 'p' ? els(n.children) : [];
    const b = kids[0] as El | undefined;
    if (kids.length >= 2 && b && b.k === 'el' && b.tag === 'b') {
      if (!table) out.push((table = { k: 'el', tag: 'table', children: [] }));
      const rest = kids.slice(1).flatMap((x) => (x.k === 'el' && x.tag === 'span' ? x.children : [x]));
      table.children.push({ k: 'el', tag: 'tr', children: [{ k: 'el', tag: 'th', children: b.children }, { k: 'el', tag: 'td', children: rest }] });
    } else if (!(n.k === 'text' && !n.text.trim())) {
      table = null;
      out.push(n);
    }
  }
  return out;
}

/** "Numbers of the day": three columns with a left ink rule, like the web. */
function Nums({ nodes, ctx }: { nodes: HNode[]; ctx: Ctx }) {
  const items: Extract<HNode, { k: 'el' }>[] = [];
  const walk = (ns: HNode[]) =>
    ns.forEach((n) => {
      if (n.k !== 'el') return;
      if (n.tag === 'p' && n.children.some((x) => x.k === 'el' && x.tag === 'b')) items.push(n);
      else walk(n.children);
    });
  walk(nodes);
  if (!items.length) return <Flow nodes={nodes} ctx={ctx} />;
  return (
    <View style={styles.numRow}>
      {items.map((p, i) => {
        const b = p.children.find((x) => x.k === 'el' && x.tag === 'b') as Extract<HNode, { k: 'el' }>;
        const rest = els(p.children).filter((x) => x !== b && !(x.k === 'el' && x.tag === 'br'));
        return (
          <View key={i} style={[styles.num, { borderLeftColor: ctx.c.ink }]}>
            <Text style={[serif(ctx.lang, 700), { fontSize: 18 * ctx.s, lineHeight: 22 * ctx.s, color: ctx.c.ink }]}>
              <Inline nodes={b.children} ctx={ctx} />
            </Text>
            <Text style={[sans(400), { fontSize: 11 * ctx.s, lineHeight: 15 * ctx.s, color: ctx.c.mute, marginTop: 3 }]}>
              <Inline nodes={rest.map((x) => (x.k === 'el' && x.tag === 'small' ? { ...x, tag: '#' } : x))} ctx={ctx} />
            </Text>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  block: { marginTop: 18 },
  nums: {},
  title: { fontSize: 11.5, letterSpacing: 1.6, borderBottomWidth: 1, paddingBottom: 3, marginBottom: 8 },
  p: { marginBottom: 6 },
  li: { paddingVertical: 7, borderStyle: 'dotted' },
  tr: { flexDirection: 'row', paddingVertical: 7, gap: 12, borderStyle: 'dotted' },
  th: { flexShrink: 0 },
  td: { flex: 1 },
  numRow: { flexDirection: 'row', gap: 8 },
  num: { flex: 1, borderLeftWidth: 2, paddingLeft: 8 },
  glos: { marginTop: 14 },
  colophon: { borderTopWidth: 1, marginTop: 16, paddingTop: 6 },
});
