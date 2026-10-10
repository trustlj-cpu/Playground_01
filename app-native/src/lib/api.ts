// Content source: the static JSON API that site/build.js writes on every web deploy.
// Every request goes to the network (no-cache); the last good copy is kept on the device
// so the app opens instantly and works offline. A web deploy is therefore picked up on the
// next refresh (app start, foreground, pull-to-refresh) without shipping a new app build.
import AsyncStorage from '@react-native-async-storage/async-storage';
import { blobStore, CACHE_BUDGET } from './cacheStore';

export const API_BASE = (process.env.EXPO_PUBLIC_API_BASE || 'https://dailydropnewspaper.com/app/v1/').replace(/\/?$/, '/');
export const USE_FIXTURES = process.env.EXPO_PUBLIC_USE_FIXTURES === '1';
export const SITE_ORIGIN = (() => {
  const m = API_BASE.match(/^(https?:\/\/[^/]+)/);
  return m ? m[1] : 'https://dailydropnewspaper.com';
})();

// Fixtures are only pulled into the bundle when the flag is set at build time
// (EXPO_PUBLIC_* values are inlined, so the require below is dead code otherwise).
const FIXTURES: Record<string, unknown> | null =
  // eslint-disable-next-line @typescript-eslint/no-require-imports -- conditional require keeps fixtures out of release bundles
  process.env.EXPO_PUBLIC_USE_FIXTURES === '1' ? require('../../fixtures').default : null;

const CACHE_INDEX = 'dd.cache.v2.index';
const OLD_PREFIX = 'dd.cache.v1:';
const OLD_INDEX = 'dd.cache.v1.keys';
const CACHE_MAX_ENTRIES = 200;

export class HttpError extends Error {
  constructor(public status: number, url: string) {
    super(`HTTP ${status} for ${url}`);
  }
}

/** API paths only: relative to the API base, or site-absolute ('/api/breaking.json…'). Full URLs are accepted
 *  only on the site's own origin — a path that reaches here from a deep link or from content must never make
 *  the app fetch (and cache, and render) JSON from another host. */
export function urlFor(path: string): string {
  if (/^[a-z][a-z0-9+.-]*:/i.test(path) || path.startsWith('//')) {
    if (path.startsWith(SITE_ORIGIN + '/')) return path;
    throw new HttpError(400, 'refused:' + path.slice(0, 80));
  }
  if (/(^|\/)\.\.(\/|$)/.test(path)) throw new HttpError(400, 'refused:' + path.slice(0, 80));
  if (path.startsWith('/')) return SITE_ORIGIN + path; // e.g. the live /api/breaking.json endpoint
  return API_BASE + path;
}

async function fromFixtures<T>(path: string): Promise<T> {
  const key = path.startsWith('/api/breaking.json') ? 'breaking.json' : path;
  await new Promise((r) => setTimeout(r, 120)); // behave like a request
  const v = FIXTURES && FIXTURES[key];
  if (!v) throw new HttpError(404, 'fixture:' + key);
  return JSON.parse(JSON.stringify(v)) as T;
}

export async function fetchJSON<T>(path: string, timeoutMs = 15000): Promise<T> {
  if (USE_FIXTURES) return fromFixtures<T>(path);
  const url = urlFor(path);
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const r = await fetch(url, { headers: { Accept: 'application/json', 'Cache-Control': 'no-cache' }, signal: ctrl.signal });
    if (!r.ok) throw new HttpError(r.status, url);
    return (await r.json()) as T;
  } finally {
    clearTimeout(t);
  }
}

// ── device cache (stale-while-revalidate)
// Copies live in blobStore() (files on native, see cacheStore.ts); AsyncStorage holds only a small index
// [{k: path, n: bytes}], most recently written first. The total is kept under CACHE_BUDGET bytes by
// dropping the oldest copies. All index changes run one after another (a promise chain), so concurrent
// writes can never lose an entry (an entry missing from the index would never be evicted).
type Entry = { k: string; n: number };
let index: Entry[] | null = null;
let chain: Promise<unknown> = Promise.resolve();
const serial = <R>(fn: () => Promise<R>): Promise<R> => {
  const run = chain.then(fn, fn);
  chain = run.catch(() => {});
  return run;
};

async function loadIndex(): Promise<Entry[]> {
  if (index) return index;
  let list: Entry[] = [];
  try {
    const v = JSON.parse((await AsyncStorage.getItem(CACHE_INDEX)) || '[]');
    if (Array.isArray(v)) list = v.filter((e) => e && typeof e.k === 'string' && typeof e.n === 'number');
  } catch {}
  // one-time clean-up of the v1 cache, which kept whole responses (glossaries ~1 MB each) in AsyncStorage
  try {
    const old = JSON.parse((await AsyncStorage.getItem(OLD_INDEX)) || 'null');
    if (Array.isArray(old)) {
      await AsyncStorage.multiRemove([...old.filter((k) => typeof k === 'string').map((k) => OLD_PREFIX + k), OLD_INDEX]);
    }
  } catch {}
  index = list;
  return list;
}
/** for tests */
export function _resetCacheIndex() {
  index = null;
  chain = Promise.resolve();
}

export async function readCache<T>(path: string): Promise<{ data: T; at: number } | null> {
  try {
    const raw = await blobStore().get(path);
    const c = raw ? JSON.parse(raw) : null;
    return c && typeof c === 'object' && 'data' in c ? { data: c.data as T, at: typeof c.at === 'number' ? c.at : 0 } : null;
  } catch {
    return null;
  }
}

export function writeCache(path: string, data: unknown): Promise<void> {
  return serial(async () => {
    try {
      const text = JSON.stringify({ data, at: Date.now() });
      const n = text.length * 2; // UTF-16 upper bound; good enough for a budget
      const list = await loadIndex();
      const i = list.findIndex((e) => e.k === path);
      if (i >= 0) list.splice(i, 1);
      if (n > CACHE_BUDGET / 2) {
        await blobStore().remove(path); // never let one response push out everything else
      } else {
        await blobStore().set(path, text);
        list.unshift({ k: path, n });
      }
      let total = list.reduce((s, e) => s + e.n, 0);
      const drop: Entry[] = [];
      while (list.length > 1 && (total > CACHE_BUDGET || list.length > CACHE_MAX_ENTRIES)) {
        const e = list.pop()!;
        total -= e.n;
        drop.push(e);
      }
      for (const e of drop) await blobStore().remove(e.k).catch(() => {});
      await AsyncStorage.setItem(CACHE_INDEX, JSON.stringify(list));
    } catch (e) {
      // storage full or unavailable: the app still works online
      if (__DEV__) console.warn('cache write failed', path, e);
    }
  });
}

/** Drops every cached API copy (used by the error screen's "try again": a copy that crashes rendering must
 *  not come back on the next launch). Settings and bookmarks are not touched. */
export function clearCache(): Promise<void> {
  return serial(async () => {
    const list = await loadIndex();
    for (const e of list.splice(0)) await blobStore().remove(e.k).catch(() => {});
    await AsyncStorage.setItem(CACHE_INDEX, '[]').catch(() => {});
  });
}

/** Cached copy if present, otherwise the network (used for one-off loads such as opening a bookmark).
 *  `parse` validates/normalises both copies; a cached copy it rejects is treated as missing. */
export async function getJSON<T>(path: string, parse: (raw: unknown) => T = (x) => x as T): Promise<T> {
  const c = await readCache<unknown>(path);
  if (c) {
    try {
      const v = parse(c.data);
      fetchJSON<unknown>(path)
        .then((d) => {
          parse(d);
          return writeCache(path, d);
        })
        .catch(() => {});
      return v;
    } catch {
      // unusable cached copy: fall through to the network
    }
  }
  const d = await fetchJSON<unknown>(path);
  const v = parse(d);
  writeCache(path, d);
  return v;
}

export const paths = {
  index: 'index.json',
  edition: (region: string, date: string, lang: string) => `${encodeURIComponent(region)}/${encodeURIComponent(date)}.${encodeURIComponent(lang)}.json`,
  glossary: (lang: string) => `glossary/${encodeURIComponent(lang)}.json`,
};
