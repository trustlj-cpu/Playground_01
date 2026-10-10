// Pure bookmark-sync logic (no React, no storage), used by BookmarkProvider and covered by unit tests.
// Identity on the server is (kind, region, date, ref) for articles and (kind, ref) for terms.
import type { ServerBookmark } from './account';

export interface ArticleBookmark {
  key: string; // region:date:id — same identity as the server (one bookmark per article, whatever the language)
  id: string;
  region: string;
  lang: string;
  date: string;
  no: number; // 0 when it came from the website (the list looks the number up in the index)
  kick: string;
  hl: string;
  url?: string; // web path of the edition page, e.g. /2026-10-10/en/
  at: number;
}

export interface TermBookmark {
  key: string; // the term itself — the server keeps one term bookmark per spelling
  term: string;
  f: string;
  d: string;
  w: string;
  region: string;
  lang: string;
  date: string;
  at: number;
}

export type Op = { m: 'POST' | 'DELETE'; b: ServerBookmark };

// Local keys follow the server's uniqueness (site schema: UNIQUE(user_id, kind, region, date, ref); terms by
// ref only). Keys that also carried the language let the same article in ko+en (or a term spelled the same in
// two languages) exist twice on the device but once on the server, so one of them vanished on every sync.
export const articleKey = (region: string, date: string, id: string) => `${region}:${date}:${id}`;
/** Web path of an edition page from the API's absolute url (https://…/2026-10-10/en/ → /2026-10-10/en/). */
export const webPath = (u?: string) => (u ? u.replace(/^https?:\/\/[^/]+/, '') || undefined : undefined);
export const termKey = (term: string) => term;

export const sid = (b: Pick<ServerBookmark, 'kind' | 'region' | 'date' | 'ref'>) => (b.kind === 'term' ? `t|${b.ref}` : `a|${b.region}|${b.date}|${b.ref}`);
export const aSid = (a: Omit<ArticleBookmark, 'at'>) => sid({ kind: 'article', region: a.region, date: a.date, ref: a.id });
export const tSid = (t: Omit<TermBookmark, 'at'>) => sid({ kind: 'term', region: t.region, date: t.date, ref: t.term });

export const toServerArticle = (a: Omit<ArticleBookmark, 'at'>): ServerBookmark => ({
  kind: 'article',
  region: a.region,
  date: a.date,
  lang: a.lang,
  ref: a.id,
  title: a.hl,
  url: a.url ? `${a.url}#${a.id}` : '',
});
export const toServerTerm = (t: Omit<TermBookmark, 'at'>): ServerBookmark => ({
  kind: 'term',
  region: t.region,
  date: t.date,
  lang: t.lang,
  ref: t.term,
  title: t.term,
  url: '',
  note: (t.d || '').slice(0, 380),
});

export const fromServerArticle = (x: ServerBookmark, prev?: ArticleBookmark): ArticleBookmark => {
  const lang = x.lang || prev?.lang || 'en';
  const url = (x.url || '').split('#')[0];
  return {
    key: articleKey(x.region, x.date, x.ref),
    id: x.ref,
    region: x.region,
    lang,
    date: x.date,
    no: prev?.no || 0,
    kick: prev?.kick || '',
    hl: prev?.hl || x.title || x.ref,
    url: prev?.url || url || undefined,
    at: prev?.at || x.created_at || Date.now(),
  };
};
export const fromServerTerm = (x: ServerBookmark, prev?: TermBookmark): TermBookmark => {
  const lang = x.lang || prev?.lang || 'en';
  return {
    key: termKey(x.ref),
    term: x.ref,
    f: prev?.f || '',
    d: prev?.d || x.note || '',
    w: prev?.w || '',
    region: x.region || prev?.region || '',
    lang,
    date: x.date || prev?.date || '',
    at: prev?.at || x.created_at || Date.now(),
  };
};

/**
 * Adds a change to the outbox. A queued POST followed by a DELETE of the same item (or the reverse)
 * cancels out — except for the op currently being sent (`inFlight`): it has (probably) reached the
 * server already, so the opposite op must be queued after it, not cancel it.
 */
export function enqueue(outbox: Op[], op: Op, inFlight: Op | null): Op[] {
  const k = sid(op.b);
  const rest = outbox.filter((o) => o === inFlight || sid(o.b) !== k);
  return rest.length < outbox.length ? rest : [...outbox, op];
}

/**
 * Server list → device lists. `pending` = ops still in the outbox (made while the list was in flight):
 * those items keep their local state. On the first merge after sign-in, device-only items are kept and
 * returned in `upload`; later, the account list is the truth (removed on the web → removed here).
 */
export function reconcile(
  items: ServerBookmark[],
  articles: ArticleBookmark[],
  terms: TermBookmark[],
  outbox: Op[],
  firstMerge: boolean,
): { articles: ArticleBookmark[]; terms: TermBookmark[]; upload: ServerBookmark[] } {
  const server = new Set(items.map(sid));
  const pending = new Set(outbox.map((o) => sid(o.b)));
  const prevA = new Map(articles.map((a) => [aSid(a), a]));
  const prevT = new Map(terms.map((t) => [tSid(t), t]));
  const nextA: ArticleBookmark[] = [];
  const nextT: TermBookmark[] = [];
  const upload: ServerBookmark[] = [];
  const seen = new Set<string>();
  for (const x of items) {
    const k = sid(x);
    if (pending.has(k) || seen.has(k)) continue;
    seen.add(k);
    if (x.kind === 'article') nextA.push(fromServerArticle(x, prevA.get(k)));
    else if (x.kind === 'term') nextT.push(fromServerTerm(x, prevT.get(k)));
  }
  for (const [k, a] of prevA) {
    if (server.has(k) && !pending.has(k)) continue;
    if (pending.has(k)) nextA.push(a);
    else if (firstMerge) {
      nextA.push(a); // made on the device before signing in: keep and upload
      upload.push(toServerArticle(a));
    }
  }
  for (const [k, t] of prevT) {
    if (server.has(k) && !pending.has(k)) continue;
    if (pending.has(k)) nextT.push(t);
    else if (firstMerge) {
      nextT.push(t);
      upload.push(toServerTerm(t));
    }
  }
  nextA.sort((a, b) => b.at - a.at);
  nextT.sort((a, b) => b.at - a.at);
  return { articles: nextA, terms: nextT, upload };
}

/** Lists read back from storage: anything that is not a usable bookmark is dropped, keys are re-derived
 *  (older versions stored region:date:lang:id / lang:term) and duplicates collapse to the newest. */
export function parseArticles(raw: string | null | undefined): ArticleBookmark[] | null {
  const v = parseJSONList(raw);
  if (!v) return null;
  return dedupe(
    v
      .filter((x) => typeof x.id === 'string' && typeof x.region === 'string' && typeof x.date === 'string')
      .map((x) => ({ ...x, key: articleKey(x.region, x.date, x.id), lang: typeof x.lang === 'string' ? x.lang : 'en', hl: String(x.hl ?? ''), kick: String(x.kick ?? ''), no: Number(x.no) || 0, at: Number(x.at) || 0 }) as ArticleBookmark),
  );
}
export function parseTerms(raw: string | null | undefined): TermBookmark[] | null {
  const v = parseJSONList(raw);
  if (!v) return null;
  return dedupe(
    v
      .filter((x) => typeof x.term === 'string' && x.term)
      .map((x) => ({ ...x, key: termKey(x.term), f: String(x.f ?? ''), d: String(x.d ?? ''), w: String(x.w ?? ''), region: String(x.region ?? ''), lang: String(x.lang ?? 'en'), date: String(x.date ?? ''), at: Number(x.at) || 0 }) as TermBookmark),
  );
}
function parseJSONList(raw: string | null | undefined): any[] | null {
  if (!raw) return null;
  try {
    const v = JSON.parse(raw);
    return Array.isArray(v) ? v.filter((x) => x && typeof x === 'object') : null;
  } catch {
    return null;
  }
}
function dedupe<T extends { key: string; at: number }>(list: T[]): T[] {
  const by = new Map<string, T>();
  for (const x of list) {
    const p = by.get(x.key);
    if (!p || x.at > p.at) by.set(x.key, x);
  }
  return [...by.values()].sort((a, b) => b.at - a.at);
}
export function parseOutbox(raw: string | null | undefined): Op[] {
  if (!raw) return [];
  try {
    const v = JSON.parse(raw);
    return Array.isArray(v) ? v.filter((o) => o && (o.m === 'POST' || o.m === 'DELETE') && o.b && typeof o.b.ref === 'string') : [];
  } catch {
    return [];
  }
}
