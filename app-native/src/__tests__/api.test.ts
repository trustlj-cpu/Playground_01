import AsyncStorage from '@react-native-async-storage/async-storage';
import { act, renderHook, waitFor } from '@testing-library/react-native';
import { _resetCacheIndex, clearCache, fetchJSON, getJSON, HttpError, readCache, urlFor, writeCache } from '../lib/api';
import { CACHE_BUDGET } from '../lib/cacheStore';
import { normEdition } from '../lib/normalize';
import { useResource } from '../lib/useResource';

const okRes = (body: unknown) => ({ ok: true, status: 200, json: async () => body }) as unknown as Response;
const badJSON = () => ({ ok: true, status: 200, json: async () => JSON.parse('<html>') }) as unknown as Response;
const status = (n: number) => ({ ok: false, status: n, json: async () => ({}) }) as unknown as Response;

let fetchMock: jest.Mock;
beforeEach(async () => {
  fetchMock = jest.fn();
  (globalThis as any).fetch = fetchMock;
  await AsyncStorage.clear();
  _resetCacheIndex();
});

describe('urlFor', () => {
  it('resolves API paths and refuses foreign hosts', () => {
    expect(urlFor('index.json')).toBe('https://dailydropnewspaper.com/app/v1/index.json');
    expect(urlFor('/api/breaking.json?region=KR')).toBe('https://dailydropnewspaper.com/api/breaking.json?region=KR');
    expect(urlFor('https://dailydropnewspaper.com/app/v1/x.json')).toBe('https://dailydropnewspaper.com/app/v1/x.json');
    expect(() => urlFor('https://evil.example/x.json')).toThrow(HttpError);
    expect(() => urlFor('//evil.example/x.json')).toThrow();
    expect(() => urlFor('../../secret')).toThrow();
    expect(() => urlFor('javascript:alert(1)')).toThrow();
  });
});

describe('fetchJSON', () => {
  it('returns parsed JSON on success', async () => {
    fetchMock.mockResolvedValue(okRes({ a: 1 }));
    await expect(fetchJSON('index.json')).resolves.toEqual({ a: 1 });
    expect(fetchMock.mock.calls[0][0]).toBe('https://dailydropnewspaper.com/app/v1/index.json');
  });
  it('throws HttpError with the status on 404', async () => {
    fetchMock.mockResolvedValue(status(404));
    await expect(fetchJSON('x.json')).rejects.toMatchObject({ status: 404 });
  });
  it('propagates network errors and malformed JSON', async () => {
    fetchMock.mockRejectedValue(new TypeError('Network request failed'));
    await expect(fetchJSON('x.json')).rejects.toThrow('Network request failed');
    fetchMock.mockResolvedValue(badJSON());
    await expect(fetchJSON('x.json')).rejects.toThrow(SyntaxError);
  });
  it('never fetches a foreign URL', async () => {
    await expect(fetchJSON('https://evil.example/e.json')).rejects.toBeInstanceOf(HttpError);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe('device cache', () => {
  it('round-trips and keeps settings-sized data out of AsyncStorage', async () => {
    await writeCache('glossary/ko.json', { terms: ['x'.repeat(10000)] });
    const c = await readCache<{ terms: string[] }>('glossary/ko.json');
    expect(c?.data.terms[0]).toHaveLength(10000);
    const keys = await AsyncStorage.getAllKeys();
    expect(keys).toEqual(['dd.cache.v2.index']); // only the small index lives in AsyncStorage
  });

  it('is bounded by bytes: oldest copies go first, the newest stays', async () => {
    const chunk = 'x'.repeat(Math.floor(CACHE_BUDGET / 2 / 2) - 100); // ~ a quarter of the budget each
    for (let i = 0; i < 6; i++) await writeCache(`p${i}.json`, chunk);
    const index = JSON.parse((await AsyncStorage.getItem('dd.cache.v2.index'))!);
    const total = index.reduce((s: number, e: any) => s + e.n, 0);
    expect(total).toBeLessThanOrEqual(CACHE_BUDGET);
    expect(index[0].k).toBe('p5.json');
    expect(await readCache('p0.json')).toBeNull();
    expect(await readCache('p5.json')).not.toBeNull();
  });

  it('concurrent first writes keep every key in the index', async () => {
    await Promise.all(Array.from({ length: 10 }, (_, i) => writeCache(`k${i}.json`, { i })));
    const index = JSON.parse((await AsyncStorage.getItem('dd.cache.v2.index'))!);
    expect(index.map((e: any) => e.k).sort()).toEqual(Array.from({ length: 10 }, (_, i) => `k${i}.json`).sort());
  });

  it('removes the old v1 AsyncStorage cache', async () => {
    await AsyncStorage.setItem('dd.cache.v1.keys', JSON.stringify(['a.json']));
    await AsyncStorage.setItem('dd.cache.v1:a.json', '{"data":1}');
    await writeCache('b.json', 1);
    expect(await AsyncStorage.getItem('dd.cache.v1:a.json')).toBeNull();
    expect(await AsyncStorage.getItem('dd.cache.v1.keys')).toBeNull();
  });

  it('clearCache drops every copy', async () => {
    await writeCache('a.json', 1);
    await clearCache();
    expect(await readCache('a.json')).toBeNull();
  });

  it('getJSON: cached copy first, network when missing, rejects unusable cache', async () => {
    fetchMock.mockResolvedValue(okRes({ v: 'net' }));
    await expect(getJSON('a.json')).resolves.toEqual({ v: 'net' });
    await writeCache('b.json', { v: 'cached' });
    await expect(getJSON('b.json')).resolves.toEqual({ v: 'cached' });
    // cached copy fails validation → network
    await writeCache('KR/2026-10-10.ko.json', { nope: true });
    fetchMock.mockResolvedValue(okRes({ region: 'KR', lang: 'ko', date: '2026-10-10', stories: [] }));
    const ed = await getJSON('KR/2026-10-10.ko.json', normEdition);
    expect(ed.region).toBe('KR');
  });
});

describe('useResource', () => {
  const parse = (x: unknown) => {
    if (!x || typeof (x as any).v !== 'number') throw new Error('shape');
    return x as { v: number };
  };

  it('shows the network copy and caches it', async () => {
    fetchMock.mockResolvedValue(okRes({ v: 1 }));
    const { result } = await renderHook(() => useResource<{ v: number }>('r.json', { parse }));
    await waitFor(() => expect(result.current.data).toEqual({ v: 1 }));
    expect(result.current.error).toBeNull();
    expect(result.current.loading).toBe(false);
    await waitFor(async () => expect((await readCache('r.json'))?.data).toEqual({ v: 1 }));
  });

  it.each([
    ['404', () => Promise.resolve(status(404))],
    ['network error', () => Promise.reject(new TypeError('Network request failed'))],
    ['malformed JSON', () => Promise.resolve(badJSON())],
    ['wrong shape', () => Promise.resolve(okRes({ v: 'x' }))],
  ])('falls back to the cached copy on %s', async (_, res) => {
    await writeCache('r.json', { v: 7 });
    fetchMock.mockImplementation(res);
    const { result } = await renderHook(() => useResource<{ v: number }>('r.json', { parse }));
    await waitFor(() => expect(result.current.error).not.toBeNull());
    await waitFor(() => expect(result.current.data).toEqual({ v: 7 }));
    expect(result.current.stale).toBe(true);
    // the bad response was not cached over the good copy
    expect((await readCache('r.json'))?.data).toEqual({ v: 7 });
  });

  it('offline with an empty cache: error, no data', async () => {
    fetchMock.mockRejectedValue(new TypeError('Network request failed'));
    const { result } = await renderHook(() => useResource<{ v: number }>('none.json', { parse }));
    await waitFor(() => expect(result.current.error).not.toBeNull());
    expect(result.current.data).toBeNull();
    expect(result.current.loading).toBe(false);
  });

  it('a slow older response never replaces a newer one', async () => {
    let resolveFirst!: (r: Response) => void;
    fetchMock
      .mockImplementationOnce(() => new Promise<Response>((r) => (resolveFirst = r)))
      .mockImplementationOnce(() => Promise.resolve(okRes({ v: 2 })));
    const { result } = await renderHook(() => useResource<{ v: number }>('race.json', { parse }));
    await act(async () => {
      await result.current.refresh(); // second request finishes first
    });
    expect(result.current.data).toEqual({ v: 2 });
    await act(async () => {
      resolveFirst(okRes({ v: 1 }));
      await new Promise((r) => setTimeout(r, 10));
    });
    expect(result.current.data).toEqual({ v: 2 });
    expect(result.current.loading).toBe(false);
  });

  it.each([false, true])('changing the path (keepPrevious=%s) never shows the old data under the new path unless asked', async (keep) => {
    fetchMock.mockImplementation((url: string) => Promise.resolve(okRes({ v: url.includes('a.json') ? 1 : 2 })));
    const seen: { p: string; v: number | null }[] = [];
    const { result, rerender } = await renderHook(
      ({ p }: { p: string }) => {
        const r = useResource<{ v: number }>(p, { parse, keepPrevious: keep });
        seen.push({ p, v: r.data ? r.data.v : null });
        return r;
      },
      { initialProps: { p: 'a.json' } },
    );
    await waitFor(() => expect(result.current.data).toEqual({ v: 1 }));
    await rerender({ p: 'b.json' });
    await waitFor(() => expect(result.current.data).toEqual({ v: 2 }));
    const underB = seen.filter((x) => x.p === 'b.json').map((x) => x.v);
    if (keep) expect(underB[0]).toBe(1);
    else expect(underB).not.toContain(1);
  });
});
