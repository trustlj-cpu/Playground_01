// Opening animation for TV — the phone app's typewriter masthead (app-native/src/components/Intro.tsx,
// originally dailydrop-app/inject/splash.js) with the same numbers (shared/introNumbers.ts):
// letters typed at PRINT_X while the carriage steps left, then the line rises into the Home masthead.
// TV differences: the core Animated API (native driver) instead of reanimated — the worklet curves are
// sampled into interpolation tables; any remote button skips; sound is off by default (Settings).
import { createAudioPlayer, setAudioModeAsync, type AudioPlayer } from 'expo-audio';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Easing, Platform, StyleSheet, View } from 'react-native';
import Svg, { Circle, ClipPath, Defs, Path, Rect as SvgRect } from 'react-native-svg';
import { getIntroTarget, onIntroTarget, type Rect } from '../shared/introTarget';
import { CHARS, GAP, HOLD, JOLT_MS, N, RISE, STEP_AT, STEP_MS, STRIKE_MS, T0, TOTAL, carriageAt, cubic, joltAt, seg } from '../shared/introNumbers';
import { LOGO_DOT, LOGO_PATH } from '../shared/logoPath';
import { useSettings } from '../settings';
import FocusOwner from '../tv/FocusOwner';
import { useRemoteKeys } from '../tv/remote';
import { useTV } from '../tv/scale';

const native = Platform.OS !== 'web';
const WAIT_TARGET_MS = 1500;

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

// ── sampled timelines (ms on the typing clock → value)
const SAMPLES = 14;
function table(segments: { at: number; len: number; f: (t: number) => number }[], rest: (t: number) => number) {
  const xs: number[] = [0];
  const ys: number[] = [rest(0)];
  for (const s of segments) {
    for (let j = 0; j <= SAMPLES; j++) {
      const t = s.at + (s.len * j) / SAMPLES;
      if (t <= xs[xs.length - 1]) continue;
      xs.push(t);
      ys.push(s.f(t));
    }
  }
  xs.push(TOTAL + 1);
  ys.push(rest(TOTAL + 1));
  return { inputRange: xs, outputRange: ys };
}
const CARRIAGE = table(
  CHARS.slice(0, N - 1).map((_, k) => ({ at: T0 + GAP * k + STEP_AT, len: STEP_MS, f: carriageAt })),
  carriageAt,
);
const JOLT = table(
  CHARS.map((_, k) => ({ at: T0 + GAP * k, len: JOLT_MS, f: joltAt })),
  () => 0,
);
function strike(i: number, ys: number[]) {
  const at = T0 + GAP * i;
  const xs: number[] = [];
  const out: number[] = [];
  for (let j = 0; j <= SAMPLES; j++) {
    const p = j / SAMPLES;
    xs.push(at + STRIKE_MS * p);
    out.push(seg(cubic(0.3, 0, 0.2, 1, p), [0, 0.35, 0.6, 1], ys));
  }
  return { inputRange: xs, outputRange: out, extrapolate: 'clamp' as const };
}

let playedThisLaunch = false;

function Letter({ i, clock, k, W, H, ink, dot }: { i: number; clock: Animated.Value; k: number; W: number; H: number; ink: string; dot: string }) {
  const c = CHARS[i];
  let ox: number, oy: number;
  if (c.dot) {
    ox = LOGO_DOT.cx;
    oy = LOGO_DOT.cy + LOGO_DOT.r;
  } else {
    const xs = c.rects!.flatMap((r) => [r[0], r[0] + r[2]]);
    ox = (Math.min(...xs) + Math.max(...xs)) / 2;
    oy = Math.max(...c.rects!.map((r) => r[1] + r[3]));
  }
  const anim = useMemo(
    () => ({
      opacity: clock.interpolate(strike(i, [0, 1, 0.8, 1])),
      ty: clock.interpolate({ ...strike(i, [-9, 2.5, 0, 0]), outputRange: strike(i, [-9, 2.5, 0, 0]).outputRange.map((v) => v * k) }),
      sc: clock.interpolate(strike(i, [1.06, 0.985, 1, 1])),
    }),
    [clock, i, k],
  );
  // transform-origin: centre bottom of the letter's box (emulated by translating around the origin)
  const dx = ox * k - W / 2;
  const dy = oy * k - H / 2;
  return (
    <Animated.View
      pointerEvents="none"
      style={[StyleSheet.absoluteFill, { opacity: anim.opacity, transform: [{ translateX: dx }, { translateY: dy }, { translateY: anim.ty }, { scale: anim.sc }, { translateX: -dx }, { translateY: -dy }] }]}
    >
      <Svg width={W} height={H} viewBox="0 0 894 243">
        {c.dot ? (
          <Circle cx={LOGO_DOT.cx} cy={LOGO_DOT.cy} r={LOGO_DOT.r} fill={dot} />
        ) : (
          <>
            <Defs>
              <ClipPath id={`dd-tv-intro-${i}`}>
                {c.rects!.map((r, j) => (
                  <SvgRect key={j} x={r[0]} y={r[1]} width={r[2]} height={r[3]} />
                ))}
              </ClipPath>
            </Defs>
            <Path d={LOGO_PATH} fill={ink} clipPath={`url(#dd-tv-intro-${i})`} />
          </>
        )}
      </Svg>
    </Animated.View>
  );
}

export default function Intro({ onDone }: { onDone: () => void }) {
  const { settings, colors: c } = useSettings();
  const { u, W: sw, H: sh } = useTV();
  const [show, setShow] = useState(() => settings.intro && !playedThisLaunch);
  const W = 600 * u; // the phone's min(330px, 84vw), scaled for a 10-foot screen
  const H = (W * 243) / 894;
  const k = W / 894;
  const left = (sw - W) / 2;
  const top = sh / 2 - H / 2;

  const clock = useRef(new Animated.Value(0)).current;
  const rise = useRef(new Animated.Value(0)).current;
  const fade = useRef(new Animated.Value(0)).current;
  const gone = useRef(new Animated.Value(0)).current;
  const [to, setTo] = useState<Rect | null>(null);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const finished = useRef(false);
  const players = useRef<Partial<Record<Sfx, AudioPlayer>>>({});

  const ink = c.ink;
  const dot = c.dark ? c.red : c.logoDot;

  const end = () => {
    setShow(false);
    onDone();
  };

  useEffect(() => {
    if (!show) {
      onDone();
      return;
    }
    playedThisLaunch = true;
    let alive = true;
    if (settings.introSound && native) {
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
    let raf2 = 0;
    const raf1 = requestAnimationFrame(() => {
      raf2 = requestAnimationFrame(() => {
        if (!alive) return;
        Animated.timing(clock, { toValue: TOTAL, duration: TOTAL, easing: Easing.linear, useNativeDriver: native }).start();
        CHARS.forEach((_, i) => {
          const at = T0 + GAP * i,
            last = i === N - 1;
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
      const ps = players.current;
      setTimeout(() => Object.values(ps).forEach((p) => p?.remove()), 1500);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [show]);

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
    clock.stopAnimation();
    clock.setValue(TOTAL);
    setTo(r);
    Animated.parallel([
      Animated.timing(rise, { toValue: 1, duration: RISE, easing: Easing.bezier(0.65, 0, 0.35, 1), useNativeDriver: native }),
      Animated.sequence([Animated.delay(RISE * 0.2), Animated.timing(fade, { toValue: 1, duration: RISE * 0.8, easing: Easing.bezier(0.42, 0, 0.58, 1), useNativeDriver: native })]),
      Animated.sequence([Animated.delay(RISE), Animated.timing(gone, { toValue: 1, duration: 160, useNativeDriver: native })]),
    ]).start(({ finished: ok }) => ok && end());
  }

  const skip = () => {
    if (finished.current) return;
    timers.current.forEach(clearTimeout);
    timers.current = [];
    clock.stopAnimation();
    clock.setValue(TOTAL);
    whenTarget(startRise);
  };

  useRemoteKeys(() => {
    skip();
    return true;
  }, show);

  if (!show) return null;
  // rise: from the centred line into the masthead wordmark (scale about the top-left corner)
  const sx = to ? to.width / W : 1;
  const lineTransform = to
    ? [
        { translateX: rise.interpolate({ inputRange: [0, 1], outputRange: [0, to.x - left - (W * (1 - sx)) / 2] }) },
        { translateY: rise.interpolate({ inputRange: [0, 1], outputRange: [0, to.y - top - (H * (1 - sx)) / 2] }) },
        { scale: rise.interpolate({ inputRange: [0, 1], outputRange: [1, sx] }) },
      ]
    : [{ translateY: rise.interpolate({ inputRange: [0, 1], outputRange: [0, -40 * u] }) }];
  const lineOpacity = to ? 1 : rise.interpolate({ inputRange: [0, 1], outputRange: [1, 0] });
  const joltScale = W / 330; // splash.js jolt is 1.5 px on a 330 px wordmark

  return (
    <Animated.View style={[StyleSheet.absoluteFill, { zIndex: 1000, elevation: 1000, opacity: gone.interpolate({ inputRange: [0, 1], outputRange: [1, 0] }) }]} testID="intro">
      <FocusOwner onPress={skip} style={StyleSheet.absoluteFill}>
        <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: c.paper, opacity: fade.interpolate({ inputRange: [0, 1], outputRange: [1, 0] }) }]} />
        <Animated.View style={{ position: 'absolute', left, top, width: W, height: H, opacity: lineOpacity, transform: lineTransform }}>
          <Animated.View style={{ width: W, height: H, transform: [{ translateY: Animated.multiply(clock.interpolate(JOLT), joltScale) }] }}>
            <Animated.View style={{ width: W, height: H, transform: [{ translateX: Animated.multiply(clock.interpolate(CARRIAGE), k) }] }}>
              {CHARS.map((_, i) => (
                <Letter key={i} i={i} clock={clock} k={k} W={W} H={H} ink={ink} dot={dot} />
              ))}
            </Animated.View>
          </Animated.View>
        </Animated.View>
        <View />
      </FocusOwner>
    </Animated.View>
  );
}

