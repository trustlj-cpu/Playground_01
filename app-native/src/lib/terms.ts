// Glossary term matching — same rule as the website's linkTerms():
// keys sorted longest first in one alternation regex; each term is linked only at its first
// occurrence within one scope (a story on the front page, or one opened article).
import type { GlossEntry } from './types';

export interface Seg {
  t: string;
  term?: string;
}

const cache = new WeakMap<object, RegExp | null>();

function regexFor(glossary: Record<string, GlossEntry>): RegExp | null {
  if (cache.has(glossary)) return cache.get(glossary)!;
  const keys = Object.keys(glossary).filter(Boolean).sort((a, b) => b.length - a.length);
  const re = keys.length ? new RegExp('(' + keys.map((k) => k.replace(/[.*+?^${}()|[\]\\/]/g, '\\$&')).join('|') + ')', 'g') : null;
  cache.set(glossary, re);
  return re;
}

export function linkTerms(text: string, glossary: Record<string, GlossEntry> | undefined, used: Set<string>): Seg[] {
  if (!text) return [];
  const re = glossary && regexFor(glossary);
  if (!re) return [{ t: text }];
  re.lastIndex = 0;
  const out: Seg[] = [];
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text))) {
    if (used.has(m[1])) continue;
    used.add(m[1]);
    if (m.index > last) out.push({ t: text.slice(last, m.index) });
    out.push({ t: m[1], term: m[1] });
    last = m.index + m[1].length;
  }
  if (last < text.length) out.push({ t: text.slice(last) });
  return out;
}
