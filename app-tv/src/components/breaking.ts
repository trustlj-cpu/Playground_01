// Copied from app-native/src/components/BreakingList.tsx (helpers only) for the TV app — keep in sync by hand.
import type { BreakingItem } from '../shared/types';

export function ago(at?: string): string {
  const m = Math.round((Date.now() - Date.parse(at || '')) / 60000);
  if (!(m >= 0)) return '';
  return m < 60 ? m + 'm' : Math.floor(m / 60) + 'h';
}

export function when(at: string | undefined, lang: string): string {
  const d = at ? new Date(at) : null;
  if (!d || isNaN(+d)) return '';
  let t: string;
  try {
    t = d.toLocaleString(lang, { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  } catch {
    t = d.toISOString().slice(5, 16).replace('T', ' ');
  }
  return t + ' · ' + ago(at);
}

/** Same rule as the web list: newest first; internal "속보 검색" sources are not shown. */
export function metaLine(x: BreakingItem, lang: string): string {
  const src = /^속보 검색/.test(x.s || '') ? '' : x.s || '';
  return [src, when(x.at, lang)].filter(Boolean).join(' · ');
}

export const newestFirst = (items: BreakingItem[]) => items.slice().sort((a, b) => (Date.parse(b.at || '') || 0) - (Date.parse(a.at || '') || 0));
