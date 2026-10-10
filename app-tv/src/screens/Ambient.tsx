// Lean-back mode (a TV mechanic: the remote left alone on Home): headlines cycle full-screen, set in the
// web's own type — wordmark, dateline, .kick, h2.hl at the web's largest size, .deck. Any button returns to
// Home (the button is swallowed, so it never opens a story).
// While it shows, the screen is kept awake (expo-keep-awake) with OLED burn-in care: the whole composition
// shifts a few px every minute, dims after 30 min, and after 2 h lean-back ends and keep-awake is released
// so the system screensaver / sleep takes over (no new session until the remote is used again).
import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';
import React, { useEffect, useRef, useState } from 'react';
import { Animated, Platform, Text, View } from 'react-native';
import Logo from '../components/Logo';
import { deckStyle, Kick } from '../components/WebParts';
import { serif } from '../shared/theme';
import type { Edition } from '../shared/types';
import { tvStrings } from '../strings';
import { useColors } from '../settings';
import FocusOwner from '../tv/FocusOwner';
import { useBack, useRemoteKeys } from '../tv/remote';
import { useWeb } from '../tv/web';

const SLIDE_MS = 9000;
export const SHIFT_MS = 60_000;
export const DIM_AFTER_MS = 30 * 60_000;
export const STOP_AFTER_MS = 2 * 60 * 60_000;
const native = Platform.OS !== 'web';
const KEEP_AWAKE_TAG = 'dd-ambient';

/** Burn-in shift for minute n: a slow loop over small offsets (in web px, ≤ 6). */
export function burnInOffset(n: number): { x: number; y: number } {
  const P = [
    [0, 0], [3, 2], [6, 0], [3, -2], [0, -4], [-3, -2], [-6, 0], [-3, 2], [0, 4], [3, 4], [-3, -4],
  ];
  const [x, y] = P[((n % P.length) + P.length) % P.length];
  return { x, y };
}

function clock(lang: string) {
  const d = new Date();
  try {
    return d.toLocaleTimeString(lang, { hour: '2-digit', minute: '2-digit' });
  } catch {
    return d.toTimeString().slice(0, 5);
  }
}

export default function Ambient({ edition, onExit, onExpire, startAt = 0 }: { edition: Edition; onExit: () => void; onExpire?: () => void; startAt?: number }) {
  const c = useColors();
  const w = useWeb();
  const lang = edition.lang;
  const T = tvStrings(lang).tv;
  const stories = edition.stories;
  const [i, setI] = useState(startAt % Math.max(1, stories.length));
  const [now, setNow] = useState(() => clock(lang));
  const [minute, setMinute] = useState(0);
  const fade = useRef(new Animated.Value(0)).current;
  const lift = useRef(new Animated.Value(30)).current;
  const started = useRef(Date.now());

  useRemoteKeys(() => {
    onExit();
    return true;
  });
  useBack(() => {
    onExit();
    return true;
  });

  // keep the screen on only while lean-back is showing
  useEffect(() => {
    let alive = true;
    let active = false;
    const release = () => {
      try {
        Promise.resolve(deactivateKeepAwake(KEEP_AWAKE_TAG)).catch(() => {});
      } catch {}
    };
    activateKeepAwakeAsync(KEEP_AWAKE_TAG)
      .then(() => {
        active = true;
        if (!alive) release(); // left lean-back before the lock was granted
      })
      .catch(() => {}); // e.g. no Wake Lock API on this browser
    return () => {
      alive = false;
      if (active) release();
    };
  }, []);

  // burn-in care: shift every minute, dim after 30 min, stop after 2 h
  useEffect(() => {
    const t = setInterval(() => {
      const age = Date.now() - started.current;
      if (age >= STOP_AFTER_MS) {
        clearInterval(t);
        (onExpire || onExit)();
        return;
      }
      setMinute(Math.floor(age / SHIFT_MS));
      setNow(clock(lang));
    }, 15_000);
    return () => clearInterval(t);
  }, [lang, onExit, onExpire]);

  useEffect(() => {
    fade.setValue(0);
    lift.setValue(w.px(16));
    Animated.parallel([
      Animated.timing(fade, { toValue: 1, duration: 900, useNativeDriver: native }),
      Animated.timing(lift, { toValue: 0, duration: 1200, useNativeDriver: native }),
    ]).start();
    const out = setTimeout(() => Animated.timing(fade, { toValue: 0, duration: 700, useNativeDriver: native }).start(), SLIDE_MS - 700);
    const next = setTimeout(() => setI((n) => (n + 1) % stories.length), SLIDE_MS);
    return () => {
      clearTimeout(out);
      clearTimeout(next);
    };
  }, [i, stories.length, fade, lift, w.k]);

  const s = stories[i];
  if (!s) return null;
  const off = burnInOffset(minute);
  const dim = minute * SHIFT_MS >= DIM_AFTER_MS;
  const fH = w.fs(38); // h2.hl clamp(…, 38px) — the web's largest headline size
  const fd = w.fs(12.5);
  return (
    <FocusOwner onPress={onExit} testID="ambient" style={{ flex: 1, backgroundColor: c.paper }}>
      <View testID="ambient-frame" style={{ flex: 1, paddingHorizontal: w.padX, paddingVertical: w.padY, opacity: dim ? 0.45 : 1, transform: [{ translateX: w.px(off.x) }, { translateY: w.px(off.y) }] }}>
        <View style={{ alignItems: 'center' }}>
          <Logo width={w.px(330)} />
        </View>
        {/* dateline: the masthead line, with the time where the edition time is on the web */}
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', borderTopWidth: w.hair, borderBottomWidth: w.hair, borderColor: c.dark ? c.rule : c.ink, paddingVertical: w.px(5), paddingHorizontal: w.px(2), marginTop: w.px(10) }}>
          <Text style={[serif(lang), { fontSize: w.fs(11), color: c.ink2 }]}>{edition.mast.label}</Text>
          <Text style={[serif(lang, 700), { fontSize: fd, letterSpacing: w.ls(0.1, fd), color: c.ink }]}>{edition.mast.dateline}</Text>
          <Text style={[serif(lang, 700), { fontSize: fd, letterSpacing: w.ls(0.1, fd), color: c.ink }]} testID="ambient-clock">
            {now}
          </Text>
        </View>
        <Animated.View style={{ flex: 1, justifyContent: 'center', maxWidth: w.px(700), opacity: fade, transform: [{ translateY: lift }] }}>
          <Kick kick={s.kick} lang={lang} />
          <Text style={[serif(lang, 700), { fontSize: fH, lineHeight: fH * 1.15, letterSpacing: w.ls(-0.025, fH), color: c.head, marginTop: w.px(6), marginBottom: w.px(8) }]} numberOfLines={4}>
            {s.hl}
          </Text>
          {!!s.dek && (
            <Text style={deckStyle(w, lang, c.ink2)} numberOfLines={3}>
              {s.dek}
            </Text>
          )}
        </Animated.View>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <Text style={[serif(lang), { fontSize: w.fs(11), color: c.ink2 }]}>
            {String(i + 1).padStart(2, '0')} / {String(stories.length).padStart(2, '0')}
          </Text>
          <Text style={[serif(lang), { fontSize: w.fs(11), color: c.mute }]}>{T.ambientHint}</Text>
        </View>
      </View>
    </FocusOwner>
  );
}
