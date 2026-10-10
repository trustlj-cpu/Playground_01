import { linkTerms } from '../lib/terms';
import type { GlossEntry } from '../lib/types';

const e: GlossEntry = { f: 'F', d: 'def', w: 'why' };
const G = (...keys: string[]) => Object.fromEntries(keys.map((k) => [k, e]));
const terms = (segs: ReturnType<typeof linkTerms>) => segs.filter((s) => s.term).map((s) => s.term);
const text = (segs: ReturnType<typeof linkTerms>) => segs.map((s) => s.t).join('');

describe('linkTerms', () => {
  it('prefers the longest key at the same position', () => {
    const segs = linkTerms('The central bank rate rose.', G('bank', 'central bank', 'rate'), new Set());
    expect(terms(segs)).toEqual(['central bank', 'rate']);
    expect(text(segs)).toBe('The central bank rate rose.');
  });

  it('links only the first occurrence within one scope (shared Set across fields)', () => {
    const used = new Set<string>();
    const a = linkTerms('tariffs and tariffs', G('tariffs'), used);
    const b = linkTerms('more tariffs', G('tariffs'), used);
    expect(terms(a)).toEqual(['tariffs']);
    expect(a.filter((s) => s.term)).toHaveLength(1);
    expect(terms(b)).toEqual([]);
    expect(text(a)).toBe('tariffs and tariffs');
  });

  it('a new scope links the term again', () => {
    expect(terms(linkTerms('tariffs', G('tariffs'), new Set()))).toEqual(['tariffs']);
    expect(terms(linkTerms('tariffs', G('tariffs'), new Set()))).toEqual(['tariffs']);
  });

  it('escapes regex characters in keys and handles CJK', () => {
    const segs = linkTerms('S&P 500(지수)와 한국은행 기준금리', G('S&P 500(지수)', '기준금리', 'a.b'), new Set());
    expect(terms(segs)).toEqual(['S&P 500(지수)', '기준금리']);
    expect(terms(linkTerms('axb', G('a.b'), new Set()))).toEqual([]);
  });

  it('copes with empty / missing glossary and empty text', () => {
    expect(linkTerms('hello', {}, new Set())).toEqual([{ t: 'hello' }]);
    expect(linkTerms('hello', undefined, new Set())).toEqual([{ t: 'hello' }]);
    expect(linkTerms('', G('x'), new Set())).toEqual([]);
  });

  it('handles a huge glossary quickly', () => {
    const big: Record<string, GlossEntry> = {};
    for (let i = 0; i < 5000; i++) big['term' + i] = e;
    big['needle'] = e;
    const body = 'word '.repeat(2000) + 'needle term4999 term1';
    const t0 = Date.now();
    const segs = linkTerms(body, big, new Set());
    expect(terms(segs)).toEqual(['needle', 'term4999', 'term1']);
    expect(Date.now() - t0).toBeLessThan(1000);
  });
});
