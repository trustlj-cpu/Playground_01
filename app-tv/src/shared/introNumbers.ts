// Copied from app-native/src/components/Intro.tsx (DailyDrop phone app) for the TV app — keep in sync by hand.
// Numbers of the typewriter masthead intro (originally dailydrop-app/inject/splash.js), viewBox 0 0 894 243.
export type Char = { right: number; rects?: [number, number, number, number][]; dot?: true };
export const CHARS: Char[] = [
  { right: 148, rects: [[0, 0, 154, 243]] },
  { right: 247.5, rects: [[154, 0, 93.5, 243]] },
  { right: 301, rects: [[247.5, 0, 53.5, 243]] },
  { right: 354, rects: [[301, 0, 53, 200]] },
  { right: 449, rects: [[354, 0, 95, 243], [349, 200, 5, 43]] },
  { right: 590, rects: [[449, 0, 141, 243]] },
  { right: 671, rects: [[590, 0, 76, 243], [666, 0, 5, 130]] },
  { right: 747, rects: [[671, 0, 76, 243], [666, 130, 5, 113]] },
  { right: 843, rects: [[747, 0, 96, 243]] },
  { right: 881, dot: true },
];
export const PRINT_X = 881, T0 = 380, GAP = 300, STEP_AT = 120, STEP_MS = 80, HOLD = 420, RISE = 520;
export const STRIKE_MS = 150, JOLT_MS = 110;
export const N = CHARS.length;
export const TOTAL = T0 + GAP * (N - 1) + STEP_AT + STEP_MS; // 3280 ms
export const SHIFTS = CHARS.map((c) => PRINT_X - c.right);

// CSS cubic-bezier(x1,y1,x2,y2) (Newton–Raphson on x, then y)
export function cubic(x1: number, y1: number, x2: number, y2: number, x: number): number {
  if (x <= 0) return 0;
  if (x >= 1) return 1;
  const cx = 3 * x1, bx = 3 * (x2 - x1) - cx, ax = 1 - cx - bx;
  const cy = 3 * y1, by = 3 * (y2 - y1) - cy, ay = 1 - cy - by;
  let t = x;
  for (let i = 0; i < 8; i++) {
    const fx = ((ax * t + bx) * t + cx) * t - x;
    const d = (3 * ax * t + 2 * bx) * t + cx;
    if (Math.abs(fx) < 1e-5 || Math.abs(d) < 1e-6) break;
    t -= fx / d;
  }
  t = Math.min(1, Math.max(0, t));
  return ((ay * t + by) * t + cy) * t;
}

/** Carriage offset (wordmark units) at time t: rests with letter k's right edge at PRINT_X, then steps to k+1. */
export function carriageAt(t: number): number {
  for (let k = 0; k < N - 1; k++) {
    const at = T0 + GAP * k + STEP_AT;
    if (t < at) return SHIFTS[k];
    if (t < at + STEP_MS) return SHIFTS[k] + (SHIFTS[k + 1] - SHIFTS[k]) * cubic(0.2, 0.9, 0.3, 1.25, (t - at) / STEP_MS);
  }
  return 0;
}

/** Page jolt (screen px at 330 px wordmark) at time t: 0 → 1.5 → 0 over 110 ms after every strike, ease-out. */
export function joltAt(t: number): number {
  for (let k = 0; k < N; k++) {
    const at = T0 + GAP * k;
    if (t >= at && t < at + JOLT_MS) {
      const q = cubic(0, 0, 0.58, 1, (t - at) / JOLT_MS);
      return q < 0.3 ? (1.5 * q) / 0.3 : 1.5 * (1 - (q - 0.3) / 0.7);
    }
  }
  return 0;
}

export function seg(p: number, xs: number[], ys: number[]): number {
  if (p <= xs[0]) return ys[0];
  for (let i = 1; i < xs.length; i++) {
    if (p <= xs[i]) return ys[i - 1] + ((ys[i] - ys[i - 1]) * (p - xs[i - 1])) / (xs[i] - xs[i - 1]);
  }
  return ys[ys.length - 1];
}
