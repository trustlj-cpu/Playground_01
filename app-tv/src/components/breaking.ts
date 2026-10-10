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

// "최신" (latest) suffix the feed puts on a press's main feed, e.g. "FAZ 최신" → "FAZ · Neueste".
const LATEST: Record<string, string> = {
  ko: '최신', ja: '最新', en: 'Latest', de: 'Neueste', fr: 'Dernières', es: 'Últimas', pt: 'Últimas', it: 'Ultime', nl: 'Laatste', 'zh-TW': '最新', hi: 'ताज़ा',
};

/** Breaking-news source label for display. The feed stores internal Korean labels; same rule as the web:
 *  sources starting with "속보 검색" are hidden, "(구글뉴스 경유)" (via Google News) is stripped, and the
 *  "최신" suffix is shown in the reader's language. Non-Korean readers never see other Hangul fragments. */
export function cleanSource(s: string | undefined, lang: string): string {
  let src = (s || '').trim();
  if (!src || /^속보\s*검색/.test(src)) return '';
  src = src.replace(/\s*[(（]\s*구글\s*뉴스\s*경유\s*[)）]/g, '').trim();
  let latest = false;
  const m = src.match(/^(.*\S)\s+최신$/);
  if (m) {
    src = m[1];
    latest = true;
  }
  const ko = String(lang || '').startsWith('ko');
  if (!ko) src = src.replace(/\s*[(（][^)）]*[\uAC00-\uD7A3][^)）]*[)）]/g, '').trim(); // other internal notes in parentheses
  if (!ko && /[\uAC00-\uD7A3]/.test(src)) return ''; // still an internal Korean label → hide like "속보 검색"
  if (!src) return '';
  return latest ? src + ' · ' + (LATEST[lang] || LATEST[String(lang).split('-')[0]] || LATEST.en) : src;
}

/** Same rule as the web list: newest first; internal source labels cleaned (cleanSource). */
export function metaLine(x: BreakingItem, lang: string): string {
  return [cleanSource(x.s, lang), when(x.at, lang)].filter(Boolean).join(' · ');
}

/** Identity of a breaking list for change detection: the feed rewrites `at` on every poll, so only
 *  link, title and source count (a new poll with the same items must not re-render or re-write the cache). */
export function breakingFingerprint(d: { items?: BreakingItem[] } | null | undefined): string {
  return (d?.items || []).map((i) => [i.u, i.t, i.s || ''].join('\u0001')).join('\u0002');
}

export const newestFirst = (items: BreakingItem[]) => items.slice().sort((a, b) => (Date.parse(b.at || '') || 0) - (Date.parse(a.at || '') || 0));
