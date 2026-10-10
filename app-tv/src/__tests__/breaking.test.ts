import { breakingFingerprint, cleanSource, metaLine } from '../components/breaking';

describe('cleanSource (T17)', () => {
  it('hides internal search sources', () => {
    expect(cleanSource('속보 검색: 샘플', 'de')).toBe('');
    expect(cleanSource('속보 검색', 'ko')).toBe('');
  });
  it('strips the "via Google News" note', () => {
    expect(cleanSource('Reuters (구글뉴스 경유)', 'de')).toBe('Reuters');
    expect(cleanSource('Reuters（구글뉴스 경유）', 'en')).toBe('Reuters');
    expect(cleanSource('연합뉴스 (구글뉴스 경유)', 'ko')).toBe('연합뉴스');
  });
  it('maps the "최신" suffix to the reader language', () => {
    expect(cleanSource('FAZ 최신', 'de')).toBe('FAZ · Neueste');
    expect(cleanSource('Le Monde 최신', 'fr')).toBe('Le Monde · Dernières');
    expect(cleanSource('BBC 최신', 'en')).toBe('BBC · Latest');
    expect(cleanSource('한겨레 최신', 'ko')).toBe('한겨레 · 최신');
  });
  it('never shows Hangul labels to non-Korean readers', () => {
    expect(cleanSource('데일리드롭', 'de')).toBe('');
    expect(cleanSource('Spiegel (내부 메모)', 'de')).toBe('Spiegel');
    expect(cleanSource('데일리드롭', 'ko')).toBe('데일리드롭');
    expect(cleanSource('DailyDrop', 'en')).toBe('DailyDrop');
  });
  it('metaLine joins the cleaned source', () => {
    expect(metaLine({ t: 'x', u: 'u', s: 'Reuters (구글뉴스 경유)' }, 'de')).toBe('Reuters');
  });
});

describe('breakingFingerprint (T16)', () => {
  it('ignores the volatile at field', () => {
    const a = { items: [{ t: 'A', u: 'u1', s: 'S', at: '2026-10-10T10:00:00Z' }] };
    const b = { items: [{ t: 'A', u: 'u1', s: 'S', at: '2026-10-10T10:01:00Z' }] };
    expect(breakingFingerprint(a)).toBe(breakingFingerprint(b));
    expect(breakingFingerprint(a)).not.toBe(breakingFingerprint({ items: [{ t: 'B', u: 'u1', s: 'S' }] }));
  });
});
