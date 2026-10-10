// Content source: the static JSON API that site/build.js writes on every web deploy.
// Every request goes to the network (no-cache); the last good copy is kept on the device
// so the app opens instantly and works offline. A web deploy is therefore picked up on the
// next refresh (app start, foreground, pull-to-refresh) without shipping a new app build.
import AsyncStorage from '@react-native-async-storage/async-storage';

export const API_BASE = (process.env.EXPO_PUBLIC_API_BASE || 'https://dailydropnewspaper.com/app/v1/').replace(/\/?$/, '/');
export const USE_FIXTURES = process.env.EXPO_PUBLIC_USE_FIXTURES === '1';
export const SITE_ORIGIN = (() => {
  const m = API_BASE.match(/^(https?:\/\/[^/]+)/);
  return m ? m[1] : 'https://dailydropnewspaper.com';
})();

// Fixtures are only pulled into the bundle when the flag is set at build time
// (EXPO_PUBLIC_* values are inlined, so the require below is dead code otherwise).
const FIXTURES: Record<string, unknown> | null =
  process.env.EXPO_PUBLIC_USE_FIXTURES === '1' ? require('../../fixtures').default : null;

const CACHE_PREFIX = 'dd.cache.v1:';
const CACHE_INDEX = 'dd.cache.v1.keys';
const CACHE_MAX = 30; // editions ~50 KB, a glossary ~1 MB: stays under Android's 6 MB AsyncStorage default

export class HttpError extends Error {
  constructor(public status: number, url: string) {
    super(`HTTP ${status} for ${url}`);
  }
}

export function urlFor(path: string): string {
  if (/^https?:\/\//.test(path)) return path;
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
let keysCache: string[] | null = null;
async function cacheKeys(): Promise<string[]> {
  if (keysCache) return keysCache;
  try {
    keysCache = JSON.parse((await AsyncStorage.getItem(CACHE_INDEX)) || '[]');
  } catch {
    keysCache = [];
  }
  return keysCache!;
}

export async function readCache<T>(path: string): Promise<{ data: T; at: number } | null> {
  try {
    const raw = await AsyncStorage.getItem(CACHE_PREFIX + path);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export async function writeCache(path: string, data: unknown): Promise<void> {
  try {
    await AsyncStorage.setItem(CACHE_PREFIX + path, JSON.stringify({ data, at: Date.now() }));
    const keys = (await cacheKeys()).filter((k) => k !== path);
    keys.unshift(path);
    const drop = keys.splice(CACHE_MAX);
    keysCache = keys;
    await AsyncStorage.setItem(CACHE_INDEX, JSON.stringify(keys));
    if (drop.length) await AsyncStorage.multiRemove(drop.map((k) => CACHE_PREFIX + k));
  } catch {
    // storage full or unavailable: the app still works online
  }
}

/** Cached copy if present, otherwise the network (used for one-off loads such as opening a bookmark). */
export async function getJSON<T>(path: string): Promise<T> {
  const c = await readCache<T>(path);
  if (c) {
    fetchJSON<T>(path).then((d) => writeCache(path, d)).catch(() => {});
    return c.data;
  }
  const d = await fetchJSON<T>(path);
  writeCache(path, d);
  return d;
}

export const paths = {
  index: 'index.json',
  edition: (region: string, date: string, lang: string) => `${region}/${date}.${lang}.json`,
  glossary: (lang: string) => `glossary/${lang}.json`,
};
