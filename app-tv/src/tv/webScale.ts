// (pure: no React Native imports, unit-tested)
// The web is the only design source (ops/app/DESIGN_RULE.md). Every visual size on TV is a web CSS value
// (site/nyt.css, site/build.js NAV/BREAK/BASECSS, the edition <style>) scaled by one uniform factor:
// the TV shows the web page as it lays out in a 960 px wide window (sheet 928 px = 960 − 2 × 16 px body
// padding), scaled so the sheet fills the 5% overscan-safe width. 1920×1080 → ×1.862; Android TV 960 dp → ×0.931.
// The one exception is the 10-foot floor: no text below 12 sp on a 960×540 dp screen (= 24 px at 1080p);
// web sizes under that (kicks 10.5 px, tape 11 px, …) are raised to the floor, nothing else changes.

export const WEB_VW = 960;
export const WEB_SHEET = WEB_VW - 32;

export interface Web {
  /** screen px per web CSS px */
  k: number;
  /** a web length (margin, padding, width) in screen px */
  px: (cssPx: number) => number;
  /** a web font size in screen px, never below the 10-foot floor */
  fs: (cssPx: number) => number;
  /** a 1 px web rule */
  hair: number;
  /** web letter-spacing in em → px for a given font size */
  ls: (em: number, fontPx: number) => number;
  /** content width (overscan-safe) */
  CW: number;
  W: number;
  H: number;
  padX: number;
  padY: number;
  /** 10-foot minimum font size in screen px (12 sp on 960×540 dp) */
  minFont: number;
}

export function webScale(W: number, H: number): Omit<Web, 'W' | 'H' | 'padX' | 'padY'> & { padX: number; padY: number } {
  const padX = Math.round(W * 0.05);
  const padY = Math.round(H * 0.05);
  const CW = W - 2 * padX;
  const k = CW / WEB_SHEET;
  const minFont = H / 45;
  return {
    k,
    px: (v: number) => v * k,
    fs: (v: number) => Math.max(v * k, minFont),
    hair: Math.max(1, Math.round(k)),
    ls: (em: number, f: number) => em * f,
    CW,
    padX,
    padY,
    minFont,
  };
}

