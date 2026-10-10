import { webScale } from '../tv/webScale';

describe('10-foot text floor (T9)', () => {
  it('no text below 12 sp on a 960×540 dp Android TV', () => {
    const w = webScale(960, 540);
    for (const css of [9, 10, 10.5, 11, 11.5, 12, 13.5]) expect(w.fs(css)).toBeGreaterThanOrEqual(12 - 1e-9);
  });
  it('1080p: floor 24 px, larger web sizes scale uniformly', () => {
    const w = webScale(1920, 1080);
    expect(w.fs(10.5)).toBeCloseTo(24);
    expect(w.fs(29.76) / w.fs(21.12)).toBeCloseTo(29.76 / 21.12);
    expect(w.CW).toBe(1920 - 2 * 96);
  });
});
