// Copied from app-native/src/lib/useResource.ts (DailyDrop phone app) for the TV app, then changed:
// data is keyed by path (keyed.ts) — never shown under another path — and `fingerprint` lets a caller
// ignore volatile fields when deciding whether a poll changed anything (no re-render, no cache write).
import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';
import { fetchJSON, readCache, writeCache } from './api';
import { accept, emptySlot, MemCache, Slot, visible } from './keyed';

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
const mem = new MemCache<any>(12);

/** Load `path` into the memory + device cache ahead of time (e.g. a new edition before swapping to it). */
export async function prefetch(path: string): Promise<boolean> {
  try {
    const d = await fetchJSON(path);
    mem.set(path, d);
    writeCache(path, d);
    return true;
  } catch {
    const c = await readCache(path);
    if (c) mem.set(path, c.data, c.at);
    return !!c;
  }
}

export interface ResourceOpts<T> {
  pollMs?: number;
  /** identity used to decide whether new data differs (default: the whole JSON) */
  fingerprint?: (d: T) => string;
}

/**
 * Stale-while-revalidate JSON loader: shows the cached copy immediately, then fetches
 * the network copy. Refetches when the app returns to the foreground and on refresh().
 */
export function useResource<T>(path: string | null, opts: ResourceOpts<T> = {}): Resource<T> {
  const [slot, setSlot] = useState<Slot<T>>(emptySlot);
  const [error, setError] = useState<{ key: string; e: Error } | null>(null);
  const [loading, setLoading] = useState(false);
  const cur = useRef(path);
  const print = useRef<{ key: string | null; s: string }>({ key: null, s: '' });
  const last = useRef(0);
  const fp = useRef(opts.fingerprint);
  fp.current = opts.fingerprint;
  cur.current = path;

  const load = useCallback(async () => {
    const p = cur.current;
    if (!p) return;
    setLoading(true);
    last.current = Date.now();
    try {
      const d = await fetchJSON<T>(p);
      if (cur.current !== p) return;
      const s = fp.current ? fp.current(d) : JSON.stringify(d);
      if (print.current.key !== p || s !== print.current.s) {
        print.current = { key: p, s };
        mem.set(p, d);
        writeCache(p, d);
        const at = Date.now();
        setSlot((old) => accept(old, cur.current, p, d, at, false));
      } else {
        // unchanged: confirm the copy on screen (memory / device cache) without a new render when possible
        setSlot((old) => (old.key === p ? (old.stale ? { ...old, stale: false } : old) : accept(old, cur.current, p, (mem.get(p)?.data as T) ?? d, Date.now(), false)));
      }
      setError((e) => (e ? null : e));
    } catch (e) {
      if (cur.current === p) setError({ key: p, e: e as Error });
    } finally {
      if (cur.current === p) setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!path) return;
    let alive = true;
    const m = mem.get(path);
    if (m) print.current = { key: path, s: fp.current ? fp.current(m.data) : JSON.stringify(m.data) };
    else
      readCache<T>(path).then((c) => {
        if (!alive || cur.current !== path || !c || print.current.key === path) return;
        print.current = { key: path, s: fp.current ? fp.current(c.data) : JSON.stringify(c.data) };
        mem.set(path, c.data, c.at);
        setSlot((old) => accept(old, cur.current, path, c.data, c.at, true));
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

  const shown = visible(slot, path, mem);
  return {
    data: shown.data,
    error: error && error.key === path ? error.e : null,
    loading: loading && !!path,
    stale: shown.stale,
    updatedAt: shown.at,
    refresh: load,
  };
}
