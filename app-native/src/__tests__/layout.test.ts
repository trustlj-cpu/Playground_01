import { estText, layoutFor, masonry, splitContiguous, splitText } from '../lib/layout';

describe('layoutFor breakpoints', () => {
  it.each([
    [393, 852, 'phone', 1],
    [699, 900, 'phone', 1],
    [700, 1000, 'tablet', 2],
    [820, 1180, 'tablet', 2],
    [1099, 800, 'tablet', 2],
    [1100, 800, 'wide', 3],
    [1366, 1024, 'wide', 3],
  ])('%i×%i → %s / %i columns', (w, h, cls, cols) => {
    const l = layoutFor(w, h);
    expect(l.cls).toBe(cls);
    expect(l.cols).toBe(cols);
    expect(l.colW * cols + 22 * (cols - 1)).toBeCloseTo(l.innerW, 5);
  });

  it('caps the page width and sets the gutter', () => {
    expect(layoutFor(2000, 1200).pageW).toBe(1280);
    expect(layoutFor(1500, 1000).pageW).toBe(1180);
    expect(layoutFor(393, 852).pad).toBe(16);
    expect(layoutFor(820, 1180).pad).toBe(24);
  });

  it('flags short landscape screens', () => {
    expect(layoutFor(852, 393).short).toBe(true);
    expect(layoutFor(393, 852).short).toBe(false);
  });
});

describe('column helpers', () => {
  it('estText grows with text and counts CJK as full width', () => {
    expect(estText('', 300, 15, 20)).toBe(0);
    expect(estText('가'.repeat(100), 300, 15, 20)).toBeGreaterThan(estText('a'.repeat(100), 300, 15, 20));
  });

  it('masonry keeps every item and balances heights', () => {
    const items = [5, 1, 1, 1, 1, 1];
    const cols = masonry(items, 2, (x) => x);
    expect(cols.flat().sort()).toEqual(items.slice().sort());
    const hs = cols.map((c) => c.reduce((a, b) => a + b, 0));
    expect(Math.abs(hs[0] - hs[1])).toBeLessThanOrEqual(2); // greedy, with a 1-unit tie tolerance that keeps reading order
  });

  it('splitContiguous keeps order', () => {
    const items = [1, 2, 3, 4, 5, 6];
    const cols = splitContiguous(items, 3, () => 1);
    expect(cols.flat()).toEqual(items);
    expect(cols).toHaveLength(3);
  });

  it('splitText keeps all text and marks a continued paragraph', () => {
    const paras = ['First sentence here. Second sentence here. Third one.', 'Another paragraph that is fairly long too.'];
    const [l, r] = splitText(paras);
    const joined = [...l, ...r].map((p) => p.text).join(' ').replace(/\s+/g, ' ');
    expect(joined).toBe(paras.join(' ').replace(/\s+/g, ' '));
    expect(l.length).toBeGreaterThan(0);
  });
});
