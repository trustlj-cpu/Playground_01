import { accept, emptySlot, MemCache, visible, type Slot } from '../shared/keyed';

type Ed = { region: string; no: number };
const KR = 'KR/2026-10-10.ko.json';
const KR3 = 'KR/2026-10-03.ko.json';
const DE = 'DE/2026-10-10.de.json';

describe('keyed resource data (T6)', () => {
  it('never shows data loaded for another path', () => {
    const mem = new MemCache<Ed>();
    let slot: Slot<Ed> = emptySlot();
    slot = accept(slot, KR, KR, { region: 'KR', no: 10 }, 1, false);
    expect(visible(slot, KR, mem).data).toEqual({ region: 'KR', no: 10 });
    // user switches the country to DE while offline: the Korean paper must not appear under "DE"
    expect(visible(slot, DE, mem).data).toBeNull();
    // offline, picks past No. 3 which is not cached: loading/offline state, not the latest
    expect(visible(slot, KR3, mem).data).toBeNull();
  });

  it('drops a late response for a path that is no longer current', () => {
    let slot: Slot<Ed> = emptySlot();
    slot = accept(slot, DE, KR, { region: 'KR', no: 10 }, 1, false);
    expect(slot.key).toBeNull();
    expect(visible(slot, DE, new MemCache()).data).toBeNull();
  });

  it('serves the memory copy for the requested path synchronously', () => {
    const mem = new MemCache<Ed>();
    mem.set(KR3, { region: 'KR', no: 3 }, 5);
    const slot = accept(emptySlot<Ed>(), KR, KR, { region: 'KR', no: 10 }, 1, false);
    const v = visible(slot, KR3, mem);
    expect(v.data).toEqual({ region: 'KR', no: 3 });
    expect(v.key).toBe(KR3);
    expect(v.stale).toBe(true);
  });

  it('memory cache is a bounded LRU', () => {
    const mem = new MemCache<number>(2);
    mem.set('a', 1);
    mem.set('b', 2);
    mem.get('a');
    mem.set('c', 3);
    expect(mem.get('b')).toBeUndefined();
    expect(mem.get('a')?.data).toBe(1);
    expect(visible(emptySlot<number>(), null, mem).data).toBeNull();
  });
});
