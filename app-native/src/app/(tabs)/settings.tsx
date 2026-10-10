import Constants from 'expo-constants';
import * as Updates from 'expo-updates';
import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import ScreenTitle from '../../components/ScreenTitle';
import { langName, strings } from '../../i18n';
import { API_BASE, USE_FIXTURES } from '../../lib/api';
import { findRegion, pickLang, regionName, titleCase, useIndex } from '../../lib/content';
import { ThemeMode, useSettings } from '../../lib/settings';
import { para, sans, serif } from '../../lib/theme';

const STEPS = [0.85, 0.9, 0.95, 1, 1.05, 1.1, 1.15, 1.2, 1.25, 1.3];

export default function Settings() {
  const { settings, update, colors: c } = useSettings();
  const insets = useSafeAreaInsets();
  const index = useIndex();
  const L = settings.lang;
  const S = strings(L);
  const P = S.settingsPage;
  const region = findRegion(index.data, settings.region);
  const regions = index.data?.regions || [];
  const s = settings.textScale;
  const step = (d: number) => {
    const i = STEPS.findIndex((x) => Math.abs(x - s) < 0.001);
    const n = STEPS[Math.max(0, Math.min(STEPS.length - 1, (i < 0 ? 3 : i) + d))];
    update({ textScale: n });
  };

  const H = ({ t, p }: { t: string; p?: string }) => (
    <View style={[styles.h, { borderBottomColor: c.ink }]}>
      <Text style={[serif(L, 700), { fontSize: 17, color: c.head }]} accessibilityRole="header">
        {t}
      </Text>
      {!!p && <Text style={[sans(400), styles.p, { color: c.mute }]}>{p}</Text>}
    </View>
  );
  const Chip = ({ on, label, onPress }: { on: boolean; label: string; onPress: () => void }) => (
    <Pressable onPress={onPress} style={[styles.chip, { borderColor: c.ink, backgroundColor: on ? c.ink : 'transparent' }]} accessibilityRole="button" accessibilityState={{ selected: on }}>
      <Text style={[sans(600), { color: on ? c.paper : c.ink, fontSize: 13 }]}>{label}</Text>
    </Pressable>
  );

  return (
    <ScrollView style={{ flex: 1, backgroundColor: c.paper }} contentContainerStyle={{ paddingTop: insets.top, paddingHorizontal: 16, paddingBottom: 40 }}>
      <ScreenTitle title={P.title || S.settings} lang={L} />

      <H t={P.h} p={P.p} />
      {regions.map((r, i) => {
        const on = r.code === region?.code;
        const native = titleCase(r.name[r.langs[0]] || r.name.en || r.code);
        const local = regionName(r, L);
        return (
          <Pressable
            key={r.code}
            onPress={() => update({ region: r.code, lang: pickLang(r, undefined, settings.lang) })}
            style={({ pressed }) => [styles.region, i < regions.length - 1 && { borderBottomWidth: 1, borderBottomColor: c.rule2 }, pressed && { opacity: 0.6 }]}
            accessibilityRole="radio"
            accessibilityState={{ checked: on }}
          >
            <Text style={[serif(L, on ? 700 : 400), { fontSize: 15, color: c.ink, flex: 1 }]}>
              {local}
              {native !== local ? <Text style={[sans(400), { fontSize: 12, color: c.mute }]}>{'  ' + native}</Text> : null}
            </Text>
            <Text style={[sans(400), { fontSize: 11, color: c.mute, marginRight: 10 }]}>{r.langs.map(langName).join(' · ')}</Text>
            <Text style={[sans(700), { fontSize: 14, color: on ? c.red : 'transparent', width: 14 }]}>✓</Text>
          </Pressable>
        );
      })}

      {region && region.langs.length > 1 ? (
        <>
          <H t={P.h2 || S.app.language} />
          <View style={styles.chips}>
            {region.langs.map((l) => (
              <Chip key={l} on={pickLang(region, undefined, settings.lang) === l} label={langName(l)} onPress={() => update({ lang: l })} />
            ))}
          </View>
        </>
      ) : null}

      <H t={P.hs} p={P.ps} />
      <View style={styles.sizeRow}>
        <Chip on={false} label="−" onPress={() => step(-1)} />
        <Text style={[sans(600), { color: c.ink, fontSize: 15, minWidth: 54, textAlign: 'center' }]}>{Math.round(s * 100)}%</Text>
        <Chip on={false} label="+" onPress={() => step(1)} />
        <View style={{ flex: 1 }} />
        <Chip on={s === 1} label={P.reset} onPress={() => update({ textScale: 1 })} />
      </View>
      <Text style={[serif(L), { fontSize: 14.5 * s, lineHeight: 14.5 * s * 1.62, color: c.ink, marginTop: 10 }, para(L)]}>{P.preview}</Text>

      <H t={P.hm} p={P.pm} />
      <View style={styles.chips}>
        {(['system', 'light', 'dark'] as ThemeMode[]).map((m, i) => (
          <Chip key={m} on={settings.theme === m} label={(P.modes && P.modes[i]) || m} onPress={() => update({ theme: m })} />
        ))}
      </View>

      <View style={[styles.foot, { borderTopColor: c.ink }]}>
        <Text style={[serif(L), { fontSize: 12, color: c.ink2, lineHeight: 18 }]}>{S.app.aboutApp}</Text>
        <Text style={[sans(400), styles.small, { color: c.mute }]}>
          v{Constants.expoConfig?.version || '1.0.0'}
          {Updates.updateId ? ` · ${Updates.channel || 'update'} ${String(Updates.updateId).slice(0, 8)}` : ''}
          {' · '}
          {USE_FIXTURES ? 'fixtures' : API_BASE.replace(/^https?:\/\//, '')}
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  h: { marginTop: 22, paddingBottom: 6, borderBottomWidth: 1, marginBottom: 6 },
  p: { fontSize: 12.5, lineHeight: 18, marginTop: 4 },
  region: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 6 },
  chip: { borderWidth: 1, paddingHorizontal: 14, paddingVertical: 7, minWidth: 40, alignItems: 'center' },
  sizeRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 6 },
  foot: { marginTop: 28, borderTopWidth: 1, paddingTop: 8 },
  small: { fontSize: 11, marginTop: 6 },
});
