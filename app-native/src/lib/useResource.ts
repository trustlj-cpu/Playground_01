import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';
import { fetchJSON, readCache, writeCache } from './api';

export interface Resource<T> {
  data: T | null;
  error: Error | null;
  /** a network request is in flight */
  loading: boolean;
  /** data shown came from the device cache and the network has not confirmed it yet */
  stale: boolean;
  updatedAt: number | null;
  refresh: () => Promise<void>;
}

export interface ResourceOptions<T> {
  pollMs?: number;
  keepPrevious?: boolean;
  /** validates / normalises a network or cached copy; throwing marks that copy unusable (the last good one stays) */
  parse?: (raw: unknown) => T;
}

const FOREGROUND_MIN_MS = 20_000;

interface State<T> {
  path: string | null;
  data: T | null;
  error: Error | null;
  loading: boolean;
  stale: boolean;
  updatedAt: number | null;
}

const fresh = <T>(path: string | null, data: T | null): State<T> => ({ path, data, error: null, loading: !!path, stale: false, updatedAt: null });

/**
 * Stale-while-revalidate JSON loader: shows the cached copy immediately, then fetches
 * the network copy. Refetches when the app returns to the foreground, every `pollMs` and on refresh().
 *
 * Requests can overlap (poll + foreground + pull-to-refresh). Every request gets a sequence number and its
 * outcome is applied only if no newer request's outcome has been applied, so a slow old response can never
 * replace newer data; `loading` stays true until the newest request has finished.
 */
export function useResource<T>(path: string | null, opts: ResourceOptions<T> = {}): Resource<T> {
  const [st, setSt] = useState<State<T>>(() => fresh<T>(path, null));
  const cur = useRef(path);
  const raw = useRef<string>('');
  const last = useRef(0);
  const seq = useRef(0); // last request started
  const applied = useRef(0); // newest request whose outcome is on screen
  const parseRef = useRef(opts.parse);
  useEffect(() => {
    parseRef.current = opts.parse;
  });

  // path changed: reset while rendering (no commit showing the old path's data under the new path)
  let view = st;
  if (st.path !== path) {
    view = fresh<T>(path, opts.keepPrevious ? st.data : null); // Latest keeps showing the old paper until the new edition arrives
    setSt(view);
  }

  const load = useCallback(async () => {
    const p = cur.current;
    if (!p) return;
    const n = ++seq.current;
    last.current = Date.now();
    setSt((s) => (s.path === p && !s.loading ? { ...s, loading: true } : s));
    let patch: Partial<State<T>> = {};
    try {
      const body = await fetchJSON<unknown>(p);
      const d = parseRef.current ? parseRef.current(body) : (body as T);
      if (cur.current !== p || n < applied.current) return;
      applied.current = n;
      const s = JSON.stringify(body);
      patch = { error: null, stale: false, updatedAt: Date.now() };
      if (s !== raw.current) {
        raw.current = s;
        patch.data = d;
      }
      writeCache(p, body); // also refreshes the cached copy's timestamp
    } catch (e) {
      if (cur.current !== p || n < applied.current) return;
      applied.current = n;
      patch = { error: e as Error };
    } finally {
      if (cur.current === p) {
        const done = n === seq.current;
        const ps = patch;
        setSt((s) => (s.path === p ? { ...s, ...ps, loading: done ? false : s.loading } : s));
      }
    }
  }, []);

  useEffect(() => {
    cur.current = path;
    raw.current = '';
    applied.current = seq.current;
    if (!path) return;
    let alive = true;
    readCache<unknown>(path).then((c) => {
      // a network copy already arrived: the cached one is older
      if (!alive || cur.current !== path || !c || raw.current) return;
      let d: T;
      try {
        d = parseRef.current ? parseRef.current(c.data) : (c.data as T);
      } catch {
        return; // cached copy from an incompatible API version
      }
      raw.current = JSON.stringify(c.data);
      setSt((s) => (s.path === path ? { ...s, data: d, stale: true, updatedAt: c.at } : s));
    });
    load();
    return () => {
      alive = false;
    };
  }, [path, load]);

  useEffect(() => {
    const sub = AppState.addEventListener('change', (s) => {
      if (s === 'active' && Date.now() - last.current > FOREGROUND_MIN_MS) load();
    });
    return () => sub.remove();
  }, [load]);

  useEffect(() => {
    if (!opts.pollMs || !path) return;
    const t = setInterval(() => {
      if (AppState.currentState === 'active') load();
    }, opts.pollMs);
    return () => clearInterval(t);
  }, [opts.pollMs, path, load]);

  return { data: view.data, error: view.error, loading: view.loading, stale: view.stale, updatedAt: view.updatedAt, refresh: load };
}
