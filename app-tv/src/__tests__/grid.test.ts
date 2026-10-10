import { cellWidth, columnsThatFit } from '../tv/grid';

describe('past editions grid (T13)', () => {
  // content width = window − 2 × 5% overscan margin; gap 28 px at 1080p (× u)
  const cases: [number, number][] = [
    [1920, 1080], // tvOS
    [960, 540], // Android TV dp
    [1280, 720],
    [1366, 768],
    [3840, 2160],
  ];
  for (const [W, H] of cases) {
    it(`fits 3 columns at ${W}×${H}`, () => {
      const u = Math.min(W / 1920, H / 1080);
      const contentW = W - 2 * Math.round(W * 0.05);
      const gap = 28 * u;
      const w = cellWidth(contentW, 3, gap);
      expect(columnsThatFit(contentW, w, gap)).toBe(3);
      expect(3 * w + 2 * gap).toBeLessThanOrEqual(contentW);
      expect(contentW - (3 * w + 2 * gap)).toBeLessThan(1);
    });
  }
  it('the old percentage width wrapped to 2 columns', () => {
    const contentW = 1920 - 192;
    const old = (contentW * (100 - 2)) / 3 / 100; // `${(100 - 2) / 3}%`
    expect(columnsThatFit(contentW, old, 28)).toBe(2);
  });
});
