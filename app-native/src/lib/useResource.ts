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

const FOREGROUND_MIN_MS = 20_000;

/**
 * Stale-while-revalidate JSON loader: shows the cached copy immediately, then fetches
 * the network copy. Refetches when the app returns to the foreground and on refresh().
 */
export function useResource<T>(path: string | null, opts: { pollMs?: number; keepPrevious?: boolean } = {}): Resource<T> {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [loading, setLoading] = useState(false);
  const [stale, setStale] = useState(false);
  const [updatedAt, setUpdatedAt] = useState<number | null>(null);
  const cur = useRef(path);
  const raw = useRef<string>('');
  const last = useRef(0);

  const load = useCallback(async () => {
    const p = cur.current;
    if (!p) return;
    setLoading(true);
    last.current = Date.now();
    try {
      const d = await fetchJSON<T>(p);
      if (cur.current !== p) return;
      const s = JSON.stringify(d);
      if (s !== raw.current) {
        raw.current = s;
        setData(d);
        writeCache(p, d);
      }
      setError(null);
      setStale(false);
      setUpdatedAt(Date.now());
    } catch (e) {
      if (cur.current === p) setError(e as Error);
    } finally {
      if (cur.current === p) setLoading(false);
    }
  }, []);

  useEffect(() => {
    cur.current = path;
    raw.current = '';
    if (!opts.keepPrevious) setData(null); // Latest keeps showing the old paper until the new edition arrives
    setError(null);
    setStale(false);
    setUpdatedAt(null);
    if (!path) return;
    let alive = true;
    readCache<T>(path).then((c) => {
      if (!alive || cur.current !== path || !c || raw.current) return;
      // (cache hit for the new path replaces any previous data immediately)
      raw.current = JSON.stringify(c.data);
      setData(c.data);
      setStale(true);
      setUpdatedAt(c.at);
    });
    load();
    return () => {
      alive = false;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
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

  return { data, error, loading, stale, updatedAt, refresh: load };
}
