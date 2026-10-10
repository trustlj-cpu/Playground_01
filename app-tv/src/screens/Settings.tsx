// Settings: region (edition), language, display (dark / paper), lean-back delay, opening animation and sound.
// Every choice is saved on the device (AsyncStorage) and applies immediately.
import Constants from 'expo-constants';
import React from 'react';
import { ScrollView, Text, View } from 'react-native';
import { regionName } from '../shared/content';
import { langName } from '../shared/i18n';
import { API_BASE, USE_FIXTURES } from '../shared/api';
import { sans, serif } from '../shared/theme';
import type { Index } from '../shared/types';
import { tvStrings } from '../strings';
import { AMBIENT_CHOICES, useColors, useSettings } from '../settings';
import Focusable from '../tv/Focusable';
import { useBack } from '../tv/remote';
import { useTV } from '../tv/scale';

function Row({ title, note, children }: { title: string; note?: string; children: React.ReactNode }) {
  const c = useColors();
  const { u } = useTV();
  return (
    <View style={{ flexDirection: 'row', paddingVertical: 26 * u, borderTopWidth: Math.max(1, 1.5 * u), borderTopColor: c.rule2, gap: 40 * u }}>
      <View style={{ width: 420 * u }}>
        <Text style={[sans(700), { fontSize: 30 * u, color: c.ink }]}>{title}</Text>
        {!!note && <Text style={[sans(400), { fontSize: 20 * u, lineHeight: 30 * u, color: c.mute, marginTop: 8 * u }]}>{note}</Text>}
      </View>
      <View style={{ flex: 1, flexDirection: 'row', flexWrap: 'wrap', gap: 18 * u }}>{children}</View>
    </View>
  );
}

function Pill({ label, on, onPress, autoFocus, testID }: { label: string; on: boolean; onPress: () => void; autoFocus?: boolean; testID?: string }) {
  const c = useColors();
  const { u } = useTV();
  return (
    <Focusable
      onPress={onPress}
      autoFocus={autoFocus}
      radius={32 * u}
      scale={1.06}
      testID={testID}
      style={{ paddingHorizontal: 28 * u, paddingVertical: 12 * u, backgroundColor: on ? c.ink : c.paper2, borderWidth: Math.max(1, 1.5 * u), borderColor: on ? c.ink : c.rule2 }}
    >
      <Text style={[sans(on ? 700 : 400), { fontSize: 26 * u, color: on ? c.paper : c.ink }]}>
        {on ? '✓ ' : ''}
        {label}
      </Text>
    </Focusable>
  );
}

export default function Settings({ index, onClose }: { index: Index | null; onClose: () => void }) {
  const c = useColors();
  const { u, padX, padY } = useTV();
  const { settings: st, update } = useSettings();
  const S = tvStrings(st.lang);
  useBack(() => {
    onClose();
    return true;
  });
  const region = index?.regions.find((r) => r.code === st.region) || index?.regions[0];
  const sp = S.settingsPage;
  const ambLabel = (n: number) => (n === 0 ? S.app.off : n < 60 ? S.tv.sec.replace('{n}', String(n)) : S.tv.min.replace('{n}', String(n / 60)));
  const version = Constants.expoConfig?.version || '';

  return (
    <View style={{ flex: 1, backgroundColor: c.paper }} testID="settings">
      <ScrollView contentContainerStyle={{ paddingHorizontal: padX, paddingTop: padY, paddingBottom: padY + 60 * u }}>
        <Text style={[serif(st.lang, 700), { fontSize: 64 * u, color: c.head, marginBottom: 30 * u }]}>{S.settings}</Text>
        <Row title={sp.h} note={sp.p}>
          {(index?.regions || []).map((r) => (
            <Pill
              key={r.code}
              label={regionName(r, st.lang)}
              on={r.code === region?.code}
              autoFocus={r.code === region?.code}
              testID={'region-' + r.code}
              onPress={() => update({ region: r.code, lang: r.langs.includes(st.lang) ? st.lang : r.langs[0] })}
            />
          ))}
        </Row>
        <Row title={sp.h2 || S.tv.langs}>
          {(region?.langs || [st.lang]).map((l) => (
            <Pill key={l} label={langName(l)} on={l === st.lang} testID={'lang-' + l} onPress={() => update({ lang: l })} />
          ))}
        </Row>
        <Row title={S.tv.theme}>
          <Pill label={S.tv.dark} on={st.theme === 'dark'} testID="theme-dark" onPress={() => update({ theme: 'dark' })} />
          <Pill label={S.tv.paper} on={st.theme === 'paper'} testID="theme-paper" onPress={() => update({ theme: 'paper' })} />
        </Row>
        <Row title={S.tv.ambient} note={S.tv.ambientP}>
          {AMBIENT_CHOICES.map((n) => (
            <Pill key={n} label={ambLabel(n)} on={st.ambient === n} testID={'ambient-' + n} onPress={() => update({ ambient: n })} />
          ))}
        </Row>
        <Row title={S.app.intro} note={S.app.introP}>
          <Pill label={`${S.app.introAnim}: ${S.app.on}`} on={st.intro} onPress={() => update({ intro: true })} />
          <Pill label={`${S.app.introAnim}: ${S.app.off}`} on={!st.intro} onPress={() => update({ intro: false })} />
          <Pill label={`${S.app.introSound}: ${S.app.on}`} on={st.introSound} onPress={() => update({ introSound: true })} />
          <Pill label={`${S.app.introSound}: ${S.app.off}`} on={!st.introSound} onPress={() => update({ introSound: false })} />
        </Row>
        <Text style={[sans(400), { fontSize: 20 * u, lineHeight: 32 * u, color: c.mute, marginTop: 30 * u }]}>
          {S.app.aboutApp}
          {'\n'}DailyDrop TV {version} · {USE_FIXTURES ? 'fixtures' : API_BASE}
        </Text>
      </ScrollView>
    </View>
  );
}
