// Responsive page metrics, following the website's device rules (site/nyt.css):
//   < 700 px  phone: one column (the current layout)
//   700–1099  tablet / foldable inner screen / landscape phone: a two-column page
//   ≥ 1100    wide tablet / desktop: a three-column broadsheet page, centred, max 1180 px (1280 from 1800 px)
// Driven by useWindowDimensions, so rotation and fold/unfold reflow live.
import { createContext, useContext } from 'react';
import { useWindowDimensions } from 'react-native';
import { useSettings } from './settings';

export type DeviceClass = 'phone' | 'tablet' | 'wide';

export const GAP = 22; // column gap (web: gap 22px with a thin rule in the middle)
export const READ_MAX = 760; // single-column screens (glossary, past editions, bookmarks, settings)
export const SHEET_MAX = 720; // article sheet / breaking list
export const TIP_MAX = 420; // glossary tooltip

export interface Layout {
  width: number;
  height: number;
  cls: DeviceClass;
  /** page width (content + side gutters), centred */
  pageW: number;
  pad: number;
  /** content width inside the gutters */
  innerW: number;
  cols: number;
  /** width of one page column */
  colW: number;
  /** type scale on top of the reader's own text size */
  tz: number;
  /** short landscape screens (landscape phone, cover screen sideways) */
  short: boolean;
}

export function layoutFor(width: number, height: number): Layout {
  const cls: DeviceClass = width >= 1100 ? 'wide' : width >= 700 ? 'tablet' : 'phone';
  const maxW = width >= 1800 ? 1280 : 1180;
  const pad = cls === 'phone' ? 16 : 24;
  const pageW = Math.min(width, maxW);
  const innerW = Math.max(0, pageW - 2 * pad);
  const cols = cls === 'wide' ? 3 : cls === 'tablet' ? 2 : 1;
  const colW = (innerW - GAP * (cols - 1)) / cols;
  const tz = width >= 1800 ? 1.12 : cls === 'wide' ? 1.07 : cls === 'tablet' ? 1.05 : 1;
  return { width, height, cls, pageW, pad, innerW, cols, colW, tz, short: height <= 500 && width > height };
}

export function useLayout(): Layout {
  const { width, height } = useWindowDimensions();
  return layoutFor(width, height);
}

/** Reader text size × device type scale. */
export function useTextScale(): number {
  const { settings } = useSettings();
  return settings.textScale * useLayout().tz;
}

/** Width available to the component being rendered (a page column, a text column…). */
export const ColumnWidth = createContext<number | null>(null);
export function useColumnWidth(): number {
  const w = useContext(ColumnWidth);
  const l = useLayout();
  return w ?? l.innerW;
}

// ── height estimates for balancing columns (no layout pass needed) ──────────────────────────────
const CJK_RE = /[ᄀ-ᇿ⺀-鿿가-힯豈-﫿＀-￯]/g;

/** Approximate rendered height of a run of text set at `size`/`lh` in a box `width` wide. */
export function estText(text: string, width: number, size: number, lh: number): number {
  if (!text) return 0;
  const cjk = (text.match(CJK_RE) || []).length;
  const em = cjk * 1.0 + (text.length - cjk) * 0.52;
  const perLine = Math.max(4, width / size);
  return Math.ceil(em / perLine) * lh;
}

/** Greedy masonry: each item goes to the currently shortest column (keeps reading order roughly left→right). */
export function masonry<T>(items: T[], n: number, h: (t: T) => number): T[][] {
  const cols: T[][] = Array.from({ length: n }, () => []);
  const hs = new Array(n).fill(0);
  for (const it of items) {
    let k = 0;
    for (let i = 1; i < n; i++) if (hs[i] < hs[k] - 1) k = i;
    cols[k].push(it);
    hs[k] += h(it);
  }
  return cols;
}

/** Contiguous balanced split of a list into n columns (column-wise reading order, like CSS columns). */
export function splitContiguous<T>(items: T[], n: number, h: (t: T) => number): T[][] {
  const cols: T[][] = [];
  let rest = items.slice();
  for (let c = n; c > 0; c--) {
    if (c === 1) {
      cols.push(rest);
      break;
    }
    const total = rest.reduce((s, x) => s + h(x), 0);
    const target = total / c;
    let acc = 0;
    let k = 0;
    while (k < rest.length) {
      const next = acc + h(rest[k]);
      if (next > target && k > 0 && next - target > target - acc) break;
      acc = next;
      k++;
      if (acc >= target) break;
    }
    cols.push(rest.slice(0, k));
    rest = rest.slice(k);
  }
  return cols;
}

/** Splits paragraphs into two balanced text columns. A paragraph may break at a sentence boundary;
 *  the piece that continues in the next column is marked `cont` (no first-line indent). */
export function splitText(paras: string[]): { text: string; cont: boolean }[][] {
  const weight = (t: string) => t.length + 30; // a paragraph break costs about one short line
  const total = paras.reduce((s, p) => s + weight(p), 0);
  const target = total / 2;
  const left: { text: string; cont: boolean }[] = [];
  const right: { text: string; cont: boolean }[] = [];
  let acc = 0;
  let i = 0;
  for (; i < paras.length; i++) {
    const w = weight(paras[i]);
    if (acc + w <= target) {
      left.push({ text: paras[i], cont: false });
      acc += w;
      continue;
    }
    // this paragraph crosses the middle: find the sentence boundary closest to it
    const sents = paras[i].match(/[^.!?。！？]+(?:[.!?。！？]+["'”’)\]]*\s*|$)/g) || [paras[i]];
    let best = 0;
    let bestD = Math.abs(acc - target); // break before the paragraph
    let run = acc + 30;
    for (let k = 0; k < sents.length; k++) {
      run += sents[k].length;
      const d = Math.abs(run - target);
      if (d < bestD) {
        bestD = d;
        best = k + 1;
      }
    }
    if (best >= sents.length) left.push({ text: paras[i], cont: false });
    else if (best === 0) right.push({ text: paras[i], cont: false });
    else {
      left.push({ text: sents.slice(0, best).join('').trimEnd(), cont: false });
      right.push({ text: sents.slice(best).join('').trimStart(), cont: true });
    }
    i++;
    break;
  }
  for (; i < paras.length; i++) right.push({ text: paras[i], cont: false });
  return [left, right];
}
