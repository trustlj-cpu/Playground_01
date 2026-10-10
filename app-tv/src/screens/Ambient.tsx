// Lean-back mode: after a while with no remote input on Home, headlines cycle full-screen like a
// news screensaver. Any button returns to Home (the button is swallowed, so it never opens a story).
import React, { useEffect, useRef, useState } from 'react';
import { Animated, Platform, Text, View } from 'react-native';
import Logo from '../components/Logo';
import { kickText } from '../components/StoryCard';
import { sans, serif } from '../shared/theme';
import type { Edition } from '../shared/types';
import { tvStrings } from '../strings';
import { useColors } from '../settings';
import FocusOwner from '../tv/FocusOwner';
import { useBack, useRemoteKeys } from '../tv/remote';
import { useTV } from '../tv/scale';

const SLIDE_MS = 9000;
const native = Platform.OS !== 'web';

function clock(lang: string) {
  const d = new Date();
  try {
    return d.toLocaleTimeString(lang, { hour: '2-digit', minute: '2-digit' });
  } catch {
    return d.toTimeString().slice(0, 5);
  }
}

export default function Ambient({ edition, onExit, startAt = 0 }: { edition: Edition; onExit: () => void; startAt?: number }) {
  const c = useColors();
  const { u, padX, padY } = useTV();
  const lang = edition.lang;
  const T = tvStrings(lang).tv;
  const stories = edition.stories;
  const [i, setI] = useState(startAt % Math.max(1, stories.length));
  const [now, setNow] = useState(() => clock(lang));
  const fade = useRef(new Animated.Value(0)).current;
  const lift = useRef(new Animated.Value(30)).current;

  useRemoteKeys(() => {
    onExit();
    return true;
  });
  useBack(() => {
    onExit();
    return true;
  });

  useEffect(() => {
    fade.setValue(0);
    lift.setValue(30 * u);
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
  }, [i, stories.length, fade, lift, u]);

  useEffect(() => {
    const t = setInterval(() => setNow(clock(lang)), 15000);
    return () => clearInterval(t);
  }, [lang]);

  const s = stories[i];
  if (!s) return null;
  return (
    <FocusOwner onPress={onExit} testID="ambient" style={{ flex: 1, backgroundColor: c.dark ? '#0d0c09' : c.paper, paddingHorizontal: padX, paddingVertical: padY }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <View>
          <Logo width={260 * u} />
          <Text style={[sans(600), { fontSize: 22 * u, color: c.mute, marginTop: 10 * u }]}>
            {edition.mast.label} · {edition.mast.dateline}
          </Text>
        </View>
        <Text style={[serif(lang, 700), { fontSize: 64 * u, color: c.ink2 }]}>{now}</Text>
      </View>
      <Animated.View style={{ flex: 1, justifyContent: 'center', maxWidth: 1500 * u, opacity: fade, transform: [{ translateY: lift }] }}>
        <Text style={[sans(700), { fontSize: 28 * u, letterSpacing: 2.4 * u, color: c.red, marginBottom: 24 * u }]}>
          {String(i + 1).padStart(2, '0')} — {kickText(s.kick).toUpperCase()}
        </Text>
        <Text style={[serif(lang, 700), { fontSize: 78 * u, lineHeight: 98 * u, letterSpacing: -1.2 * u, color: c.head }]} numberOfLines={4}>
          {s.hl}
        </Text>
        {!!s.dek && (
          <Text style={[serif(lang), { fontSize: 36 * u, lineHeight: 56 * u, color: c.ink2, marginTop: 30 * u }]} numberOfLines={3}>
            {s.dek}
          </Text>
        )}
      </Animated.View>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <View style={{ flexDirection: 'row', gap: 10 * u }}>
          {stories.map((_, k) => (
            <View key={k} style={{ width: (k === i ? 56 : 18) * u, height: 6 * u, borderRadius: 3 * u, backgroundColor: k === i ? c.red : c.rule2 }} />
          ))}
        </View>
        <Text style={[sans(400), { fontSize: 22 * u, color: c.mute }]}>{T.ambientHint}</Text>
      </View>
    </FocusOwner>
  );
}
