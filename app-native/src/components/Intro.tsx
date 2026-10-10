// Opening animation, ported from dailydrop-app/inject/splash.js with the same numbers:
// the wordmark is typed letter by letter at a fixed print position (x = 881 of the 894-wide wordmark,
// the right edge of the full stop) while the carriage steps left under it, so the full stop is struck
// exactly where it stays; then the line rises into the masthead on the Latest page and the paper fades.
// Plays once per cold start; tap to skip; off with Settings → Opening, or when the OS asks for reduced motion.
import { createAudioPlayer, setAudioModeAsync, type AudioPlayer } from 'expo-audio';
import React, { useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, Platform, Pressable, StyleSheet, useWindowDimensions } from 'react-native';
import Animated, { Easing, type SharedValue, cancelAnimation, interpolateColor, runOnJS, useAnimatedStyle, useReducedMotion, useSharedValue, withDelay, withTiming } from 'react-native-reanimated';
import Svg, { Circle, ClipPath, Defs, Path, Rect as SvgRect } from 'react-native-svg';
import { getIntroTarget, onIntroTarget, type Rect } from '../lib/introTarget';
import { useSettings } from '../lib/settings';
import { LOGO_DOT, LOGO_PATH } from './logoPath';

// ── numbers from splash.js (viewBox 0 0 894 243) ────────────────────────────────────────────────
type Char = { right: number; rects?: [number, number, number, number][]; dot?: true };
const CHARS: Char[] = [
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
const PRINT_X = 881, T0 = 380, GAP = 300, STEP_AT = 120, STEP_MS = 80, HOLD = 420, RISE = 520;
const STRIKE_MS = 150, JOLT_MS = 110;
const N = CHARS.length;
const TOTAL = T0 + GAP * (N - 1) + STEP_AT + STEP_MS; // 3280 ms
const SHIFTS = CHARS.map((c) => PRINT_X - c.right);
const WAIT_TARGET_MS = 1500; // longest wait for the masthead (e.g. Latest still loading) before rising anyway

const SFX = {
  'key-underwood': require('../../assets/sfx/key-underwood.mp3'),
  'key-mercedes-01': require('../../assets/sfx/key-mercedes-01.mp3'),
  'key-mercedes-02': require('../../assets/sfx/key-mercedes-02.mp3'),
  'key-mercedes-03': require('../../assets/sfx/key-mercedes-03.mp3'),
  'key-mercedes-04': require('../../assets/sfx/key-mercedes-04.mp3'),
  'key-mercedes-05': require('../../assets/sfx/key-mercedes-05.mp3'),
  'key-mercedes-06': require('../../assets/sfx/key-mercedes-06.mp3'),
  'key-mercedes-07': require('../../assets/sfx/key-mercedes-07.mp3'),
  'key-mercedes-08': require('../../assets/sfx/key-mercedes-08.mp3'),
  'carriage-tick': require('../../assets/sfx/carriage-tick.mp3'),
  'period-light': require('../../assets/sfx/period-light.mp3'),
};
type Sfx = keyof typeof SFX;
const KEYS: Sfx[] = ['key-underwood', 'key-mercedes-01', 'key-mercedes-03', 'key-mercedes-04', 'key-mercedes-07', 'key-mercedes-02', 'key-mercedes-05', 'key-mercedes-08', 'key-mercedes-06'];

let playedThisLaunch = false; // module state: survives remounts, resets on a cold start

// CSS cubic-bezier(x1,y1,x2,y2) as a worklet (Newton–Raphson on x, then y)
function cubic(x1: number, y1: number, x2: number, y2: number, x: number): number {
  'worklet';
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
function carriageAt(t: number): number {
  'worklet';
  for (let k = 0; k < N - 1; k++) {
    const at = T0 + GAP * k + STEP_AT;
    if (t < at) return SHIFTS[k];
    if (t < at + STEP_MS) return SHIFTS[k] + (SHIFTS[k + 1] - SHIFTS[k]) * cubic(0.2, 0.9, 0.3, 1.25, (t - at) / STEP_MS);
  }
  return 0;
}

/** Page jolt (screen px) at time t: 0 → 1.5 → 0 over 110 ms after every strike, ease-out. */
function joltAt(t: number): number {
  'worklet';
  for (let k = 0; k < N; k++) {
    const at = T0 + GAP * k;
    if (t >= at && t < at + JOLT_MS) {
      const q = cubic(0, 0, 0.58, 1, (t - at) / JOLT_MS);
      return q < 0.3 ? (1.5 * q) / 0.3 : 1.5 * (1 - (q - 0.3) / 0.7);
    }
  }
  return 0;
}

function seg(p: number, xs: number[], ys: number[]): number {
  'worklet';
  if (p <= xs[0]) return ys[0];
  for (let i = 1; i < xs.length; i++) {
    if (p <= xs[i]) return ys[i - 1] + ((ys[i] - ys[i - 1]) * (p - xs[i - 1])) / (xs[i] - xs[i - 1]);
  }
  return ys[ys.length - 1];
}

function Letter({ i, clock, k, W, H, ink, dot }: { i: number; clock: SharedValue<number>; k: number; W: number; H: number; ink: string; dot: string }) {
  const c = CHARS[i];
  const at = T0 + GAP * i;
  // transform-origin: centre bottom of the letter's own box (CSS transform-box: fill-box)
  let ox: number, oy: number;
  if (c.dot) {
    ox = LOGO_DOT.cx;
    oy = LOGO_DOT.cy + LOGO_DOT.r;
  } else {
    const xs = c.rects!.flatMap((r) => [r[0], r[0] + r[2]]);
    ox = (Math.min(...xs) + Math.max(...xs)) / 2;
    oy = Math.max(...c.rects!.map((r) => r[1] + r[3]));
  }
  const style = useAnimatedStyle(() => {
    // splash.js: 150 ms, cubic-bezier(.3,0,.2,1) over keyframes 0 / .35 / .6 / 1, fill both
    const p = cubic(0.3, 0, 0.2, 1, (clock.value - at) / STRIKE_MS);
    const done = clock.value >= at + STRIKE_MS;
    return {
      opacity: done ? 1 : seg(p, [0, 0.35, 0.6, 1], [0, 1, 0.8, 1]),
      transform: [{ translateY: done ? 0 : seg(p, [0, 0.35, 0.6, 1], [-9, 2.5, 0, 0]) * k }, { scale: done ? 1 : seg(p, [0, 0.35, 0.6, 1], [1.06, 0.985, 1, 1]) }],
    };
  });
  return (
    <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, { transformOrigin: [ox * k, oy * k, 0] }, style]}>
      <Svg width={W} height={H} viewBox="0 0 894 243">
        {c.dot ? (
          <Circle cx={LOGO_DOT.cx} cy={LOGO_DOT.cy} r={LOGO_DOT.r} fill={dot} />
        ) : (
          <>
            <Defs>
              <ClipPath id={`dd-intro-ch-${i}`}>
                {c.rects!.map((r, j) => (
                  <SvgRect key={j} x={r[0]} y={r[1]} width={r[2]} height={r[3]} />
                ))}
              </ClipPath>
            </Defs>
            <Path d={LOGO_PATH} fill={ink} clipPath={`url(#dd-intro-ch-${i})`} />
          </>
        )}
      </Svg>
    </Animated.View>
  );
}

export default function Intro() {
  const { settings, colors: c } = useSettings();
  // reduced motion is known synchronously here, so the cover never flashes up (the async check below
  // still catches a change made since start-up)
  const reduced = useReducedMotion();
  const [show, setShow] = useState(() => settings.intro && !playedThisLaunch && !reduced);
  const { width: sw, height: sh } = useWindowDimensions();
  const W = Math.min(330, sw * 0.84); // min(330px, 84vw)
  const H = (W * 243) / 894;
  const k = W / 894; // wordmark unit → screen px
  const left = (sw - W) / 2;
  const top = sh / 2 - H / 2;

  const clock = useSharedValue(0); // ms on the typing timeline
  const rise = useSharedValue(0);
  const fade = useSharedValue(0); // paper → transparent
  const gone = useSharedValue(0); // final 160 ms fade of the whole cover
  const to = useSharedValue<Rect | null>(null);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const finished = useRef(false);
  const players = useRef<Partial<Record<Sfx, AudioPlayer>>>({});

  // the same tokens as the masthead wordmark it rises into (Masthead.Logo), so nothing changes colour at hand-over
  const ink = c.head;
  const dot = c.logoDot;
  const paper = c.paper;
  const clear = paper.length === 7 ? paper + '00' : 'transparent';

  useEffect(() => {
    if (!show) return;
    playedThisLaunch = true;
    let alive = true;
    AccessibilityInfo.isReduceMotionEnabled()
      .then((r) => {
        if (r && alive) setShow(false);
      })
      .catch(() => {});

    // browsers block audio before the first user gesture, so the web build stays silent
    if (settings.introSound && Platform.OS !== 'web') {
      setAudioModeAsync({ playsInSilentMode: false, interruptionMode: 'mixWithOthers' }).catch(() => {});
      for (const name of Object.keys(SFX) as Sfx[]) {
        try {
          players.current[name] = createAudioPlayer(SFX[name]);
        } catch {}
      }
    }
    const sound = (name: Sfx, vol: number) => {
      const p = players.current[name];
      if (!p) return;
      try {
        p.volume = vol;
        p.seekTo(0).catch(() => {});
        p.play();
      } catch {}
    };
    const later = (ms: number, fn: () => void) => timers.current.push(setTimeout(fn, ms));

    // Start only once the cover has really been drawn: on a slow first launch timers queued while the
    // screen is frozen would otherwise fire every keystroke and sound at once (splash.js pitfall).
    let raf2 = 0;
    const raf1 = requestAnimationFrame(() => {
      raf2 = requestAnimationFrame(() => {
        if (!alive) return;
        clock.value = withTiming(TOTAL, { duration: TOTAL, easing: Easing.linear });
        CHARS.forEach((_, i) => {
          const at = T0 + GAP * i, last = i === N - 1;
          later(at, () => sound(last ? 'period-light' : KEYS[i % KEYS.length], last ? 0.8 : 1));
          if (!last) later(at + STEP_AT, () => sound('carriage-tick', 0.45));
        });
        later(TOTAL + HOLD, () => whenTarget(startRise));
      });
    });
    return () => {
      alive = false;
      cancelAnimationFrame(raf1);
      cancelAnimationFrame(raf2);
      timers.current.forEach(clearTimeout);
      // eslint-disable-next-line react-hooks/exhaustive-deps -- intended: the players created by this run of the effect
      const ps = players.current;
      setTimeout(() => Object.values(ps).forEach((p) => p?.remove()), 1500); // let the full stop ring out
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [show]);

  // the web waits for window 'load' so `.mast h1` is in place; here: until Latest has laid out its masthead
  function whenTarget(fn: (r: Rect | null) => void) {
    let done = false;
    const go = async () => {
      if (done) return;
      const m = getIntroTarget();
      if (!m) return;
      const r = await m().catch(() => null);
      if (done || !r) return;
      done = true;
      off();
      clearTimeout(t);
      fn(r);
    };
    const off = onIntroTarget(go);
    const t = setTimeout(() => {
      if (done) return;
      done = true;
      off();
      fn(null);
    }, WAIT_TARGET_MS);
    go();
  }

  function startRise(r: Rect | null) {
    if (finished.current) return;
    finished.current = true;
    timers.current.forEach(clearTimeout);
    cancelAnimation(clock);
    clock.value = TOTAL;
    to.value = r;
    rise.value = withTiming(1, { duration: RISE, easing: Easing.bezier(0.65, 0, 0.35, 1) });
    fade.value = withDelay(RISE * 0.2, withTiming(1, { duration: RISE * 0.8, easing: Easing.bezier(0.42, 0, 0.58, 1) }));
    gone.value = withDelay(
      RISE,
      withTiming(1, { duration: 160 }, (ok) => {
        if (ok) runOnJS(setShow)(false);
      }),
    );
  }

  const skip = () => {
    if (finished.current) return;
    timers.current.forEach(clearTimeout);
    timers.current = [];
    cancelAnimation(clock);
    clock.value = TOTAL; // like Animation.finish(): every letter in place
    whenTarget(startRise);
  };

  const rootStyle = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(fade.value, [0, 1], [paper, clear]),
    opacity: 1 - gone.value,
  }));
  const lineStyle = useAnimatedStyle(() => {
    const r = to.value;
    const p = rise.value;
    if (r) {
      return {
        transform: [{ translateX: (r.x - left) * p }, { translateY: (r.y - top) * p }, { scale: 1 + (r.width / W - 1) * p }],
      };
    }
    return { opacity: 1 - p, transform: [{ translateY: -40 * p }] };
  });
  const joltStyle = useAnimatedStyle(() => ({ transform: [{ translateY: joltAt(clock.value) }] }));
  const carriageStyle = useAnimatedStyle(() => ({ transform: [{ translateX: carriageAt(clock.value) * k }] }));

  if (!show) return null;
  return (
    <Animated.View style={[StyleSheet.absoluteFill, { zIndex: 1000, elevation: 1000 }, rootStyle]} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <Pressable style={StyleSheet.absoluteFill} onPress={skip}>
        <Animated.View style={[{ position: 'absolute', left, top, width: W, height: H, transformOrigin: [0, 0, 0] }, lineStyle]}>
          <Animated.View style={[{ width: W, height: H }, joltStyle]}>
            <Animated.View style={[{ width: W, height: H }, carriageStyle]}>
              {CHARS.map((_, i) => (
                <Letter key={i} i={i} clock={clock} k={k} W={W} H={H} ink={ink} dot={dot} />
              ))}
            </Animated.View>
          </Animated.View>
        </Animated.View>
      </Pressable>
    </Animated.View>
  );
}
