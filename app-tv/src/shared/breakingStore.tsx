// Breaking-news state, isolated from the front page: <BreakingFeed> polls the feed every 60 s and
// publishes into a tiny store only when the items actually change (link / title / source — the feed's
// `at` is rewritten on every poll). Only the ticker and the breaking list subscribe, so a poll never
// re-renders Home.
import { useEffect, useSyncExternalStore } from 'react';
import { breakingFingerprint } from '../components/breaking';
import type { BreakingItem } from './types';
import { useResource } from './useResource';

let items: BreakingItem[] = [];
let print = '';
const subs = new Set<() => void>();

export function setBreaking(next: BreakingItem[]) {
  const p = breakingFingerprint({ items: next });
  if (p === print) return;
  print = p;
  items = next;
  subs.forEach((f) => f());
}
const subscribe = (f: () => void) => {
  subs.add(f);
  return () => {
    subs.delete(f);
  };
};
const snap = () => items;

export function useBreakingItems(): BreakingItem[] {
  return useSyncExternalStore(subscribe, snap, snap);
}

export function BreakingFeed({ path }: { path: string | null }) {
  const r = useResource<{ items: BreakingItem[] }>(path, { pollMs: 60_000, fingerprint: breakingFingerprint });
  const list = r.data?.items;
  useEffect(() => {
    setBreaking(list || []);
  }, [list]);
  return null;
}
