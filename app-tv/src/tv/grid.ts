// Fixed-column grid math in pixels (percent widths + `gap` overflow and wrap to fewer columns).
/** Width of one cell so `cols` cells and `cols - 1` gaps fit exactly in `contentW` (rounded down a hair
 *  so sub-pixel rounding can never push the last cell onto the next row). */
export function cellWidth(contentW: number, cols: number, gap: number): number {
  if (cols <= 1) return Math.max(0, contentW);
  return Math.max(0, Math.floor(((contentW - gap * (cols - 1)) / cols) * 100) / 100 - 0.01);
}

/** How many cells of width `cellW` fit on one row (what flexWrap will actually lay out). */
export function columnsThatFit(contentW: number, cellW: number, gap: number): number {
  if (cellW <= 0) return 0;
  return Math.max(1, Math.floor((contentW + gap + 1e-6) / (cellW + gap)));
}
