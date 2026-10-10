// Keyed data for useResource (no React imports, unit-tested): data is only ever shown for the key
// (API path) it was loaded for. A response for an older path, or data held from a previous path,
// never appears under a new label — the caller shows its loading / offline state instead.

export interface Slot<T> {
  key: string | null;
  data: T | null;
  at: number | null;
  stale: boolean;
}

export const emptySlot = <T,>(): Slot<T> => ({ key: null, data: null, at: null, stale: false });

/** Small in-memory LRU of the last good copy per path, so switching back to a path (or to one that was
 *  prefetched) shows it synchronously, without a frame of loading state. */
export class MemCache<T = unknown> {
  private m = new Map<string, { data: T; at: number }>();
  constructor(private max = 12) {}
  get(k: string) {
    const v = this.m.get(k);
    if (v) {
      this.m.delete(k);
      this.m.set(k, v);
    }
    return v;
  }
  set(k: string, data: T, at = Date.now()) {
    this.m.delete(k);
    this.m.set(k, { data, at });
    while (this.m.size > this.max) this.m.delete(this.m.keys().next().value as string);
  }
  clear() {
    this.m.clear();
  }
}

/** What to show for `path`: the slot when it belongs to `path`, else the memory copy of `path`, else nothing. */
export function visible<T>(slot: Slot<T>, path: string | null, mem: MemCache<T>): Slot<T> {
  if (!path) return emptySlot<T>();
  if (slot.key === path && slot.data != null) return slot;
  const m = mem.get(path);
  if (m) return { key: path, data: m.data, at: m.at, stale: true };
  return { key: path, data: null, at: null, stale: false };
}

/** Accept a loaded value only if it is for the path that is current now (late responses are dropped). */
export function accept<T>(slot: Slot<T>, current: string | null, loadedFor: string, data: T, at: number, stale: boolean): Slot<T> {
  if (current !== loadedFor) return slot;
  return { key: loadedFor, data, at, stale };
}
