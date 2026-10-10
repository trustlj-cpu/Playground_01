import Constants from 'expo-constants';
import * as Updates from 'expo-updates';
import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import ScreenTitle from '../../components/ScreenTitle';
import { fmt, langName, strings } from '../../i18n';
import { API_BASE, USE_FIXTURES } from '../../lib/api';
import { useBookmarks } from '../../lib/bookmarks';
import { findRegion, pickLang, regionName, titleCase, useIndex } from '../../lib/content';
import { READ_MAX } from '../../lib/layout';
import { ThemeMode, useSettings } from '../../lib/settings';
import type { Palette } from '../../lib/theme';
import { para, sans, serif } from '../../lib/theme';

// Defined at module level (not inside Settings): a component created during render is a new type on every
// render, so React remounts it — every chip lost its pressed state and screen-reader focus on each tap.
function H({ t, p, c, L }: { t: string; p?: string; c: Palette; L: string }) {
  return (
    <View style={[styles.h, { borderBottomColor: c.ink }]}>
      <Text style={[serif(L, 700), { fontSize: 17, color: c.head }]} accessibilityRole="header">
        {t}
      </Text>
      {!!p && <Text style={[sans(400), styles.p, { color: c.mute }]}>{p}</Text>}
    </View>
  );
}

function Chip({ on, label, onPress, c, a11y, role = 'button' }: { on: boolean; label: string; onPress: () => void; c: Palette; a11y?: string; role?: 'button' | 'radio' }) {
  return (
    <Pressable
      onPress={onPress}
      style={[styles.chip, { borderColor: c.ink, backgroundColor: on ? c.ink : 'transparent' }]}
      accessibilityRole={role}
      accessibilityLabel={a11y}
      accessibilityState={role === 'radio' ? { checked: on } : undefined}
      hitSlop={4}
    >
      <Text style={[sans(600), { color: on ? c.paper : c.ink, fontSize: 13 }]}>{label}</Text>
    </Pressable>
  );
}

const STEPS = [0.85, 0.9, 0.95, 1, 1.05, 1.1, 1.15, 1.2, 1.25, 1.3];

export default function Settings() {
  const { settings, update, colors: c } = useSettings();
  const insets = useSafeAreaInsets();
  const bm = useBookmarks();
  const index = useIndex();
  const L = settings.lang;
  const S = strings(L);
  const P = S.settingsPage;
  const region = findRegion(index.data, settings.region);
  const regions = index.data?.regions || [];
  // languages the current edition really has (CH lists fr/it, but its editions are not published in them yet)
  const latestOf = (r: NonNullable<typeof region>) => r.editions.find((e) => e.date === r.latest.date) || r.editions[0];
  const langsOf = (r: NonNullable<typeof region>) => (latestOf(r)?.langs.length ? latestOf(r)!.langs : r.langs);
  const s = settings.textScale;
  const step = (d: number) => {
    const i = STEPS.findIndex((x) => Math.abs(x - s) < 0.001);
    const n = STEPS[Math.max(0, Math.min(STEPS.length - 1, (i < 0 ? 3 : i) + d))];
    update({ textScale: n });
  };

  return (
    <ScrollView style={{ flex: 1, backgroundColor: c.paper }} contentContainerStyle={{ paddingTop: insets.top, paddingHorizontal: 16, paddingBottom: 40, width: '100%', maxWidth: READ_MAX + 32, alignSelf: 'center' }}>
      <ScreenTitle title={P.title || S.settings} lang={L} />

      <H t={P.h} p={P.p} c={c} L={L} />
      {regions.map((r, i) => {
        const on = r.code === region?.code;
        const native = titleCase(r.name[r.langs[0]] || r.name.en || r.code);
        const local = regionName(r, L);
        return (
          <Pressable
            key={r.code}
            onPress={() => update({ region: r.code, lang: pickLang(r, latestOf(r), settings.lang) })}
            style={({ pressed }) => [styles.region, i < regions.length - 1 && { borderBottomWidth: 1, borderBottomColor: c.rule2 }, pressed && { opacity: 0.6 }]}
            accessibilityRole="radio"
            accessibilityState={{ checked: on }}
          >
            <Text style={[serif(L, on ? 700 : 400), { fontSize: 15, color: c.ink, flex: 1 }]}>
              {local}
              {native !== local ? <Text style={[sans(400), { fontSize: 12, color: c.mute }]}>{'  ' + native}</Text> : null}
            </Text>
            <Text style={[sans(400), { fontSize: 11, color: c.mute, marginRight: 10 }]}>{langsOf(r).map(langName).join(' · ')}</Text>
            <Text style={[sans(700), { fontSize: 14, color: on ? c.red : 'transparent', width: 14 }]}>✓</Text>
          </Pressable>
        );
      })}

      {region && langsOf(region).length > 1 ? (
        <>
          <H t={P.h2 || S.app.language} c={c} L={L} />
          <View style={styles.chips}>
            {langsOf(region).map((l) => (
              <Chip key={l} c={c} role="radio" on={pickLang(region, latestOf(region), settings.lang) === l} label={langName(l)} onPress={() => update({ lang: l })} />
            ))}
          </View>
        </>
      ) : null}

      <H t={P.hs} p={P.ps} c={c} L={L} />
      <View style={styles.sizeRow}>
        <Chip c={c} on={false} label="−" a11y={`${P.hs || 'Text size'} −`} onPress={() => step(-1)} />
        <Text style={[sans(600), { color: c.ink, fontSize: 15, minWidth: 54, textAlign: 'center' }]}>{Math.round(s * 100)}%</Text>
        <Chip c={c} on={false} label="+" a11y={`${P.hs || 'Text size'} +`} onPress={() => step(1)} />
        <View style={{ flex: 1 }} />
        <Chip c={c} on={s === 1} label={P.reset} onPress={() => update({ textScale: 1 })} />
      </View>
      <Text style={[serif(L), { fontSize: 14.5 * s, lineHeight: 14.5 * s * 1.62, color: c.ink, marginTop: 10 }, para(L)]}>{P.preview}</Text>

      <H t={P.hm} p={P.pm} c={c} L={L} />
      <View style={styles.chips}>
        {(['system', 'light', 'dark'] as ThemeMode[]).map((m, i) => (
          <Chip key={m} c={c} role="radio" on={settings.theme === m} label={(P.modes && P.modes[i]) || m} onPress={() => update({ theme: m })} />
        ))}
      </View>

      <H t={S.app.intro} p={S.app.introP} c={c} L={L} />
      <View style={styles.chips}>
        <Text style={[sans(400), styles.lbl, { color: c.ink }]}>{S.app.introAnim}</Text>
        <Chip c={c} role="radio" a11y={`${S.app.introAnim} ${S.app.on}`} on={settings.intro} label={S.app.on} onPress={() => update({ intro: true })} />
        <Chip c={c} role="radio" a11y={`${S.app.introAnim} ${S.app.off}`} on={!settings.intro} label={S.app.off} onPress={() => update({ intro: false })} />
      </View>
      <View style={styles.chips}>
        <Text style={[sans(400), styles.lbl, { color: settings.intro ? c.ink : c.mute }]}>{S.app.introSound}</Text>
        <Chip c={c} role="radio" a11y={`${S.app.introSound} ${S.app.on}`} on={settings.introSound} label={S.app.on} onPress={() => update({ introSound: true })} />
        <Chip c={c} role="radio" a11y={`${S.app.introSound} ${S.app.off}`} on={!settings.introSound} label={S.app.off} onPress={() => update({ introSound: false })} />
      </View>

      {bm.syncEnabled ? (
        <>
          <H t={S.app.account} p={S.app.accountP} c={c} L={L} />
          {bm.user ? (
            <>
              <Text style={[sans(400), { color: c.ink, fontSize: 13.5, marginTop: 4 }]}>{fmt(S.app.signedInAs, { who: bm.user.name || bm.user.email })}</Text>
              <Text style={[sans(400), styles.small, { color: bm.sync === 'error' ? c.red : c.mute }]}>
                {bm.sync === 'syncing'
                  ? S.app.syncing
                  : bm.sync === 'error'
                    ? S.app.syncFail
                    : bm.lastSync
                      ? fmt(S.app.synced, { t: new Date(bm.lastSync).toLocaleTimeString(L, { hour: '2-digit', minute: '2-digit' }) })
                      : ''}
              </Text>
              <View style={styles.chips}>
                <Chip c={c} on={false} label={S.app.syncNow} onPress={() => bm.syncNow()} />
                <Chip c={c} on={false} label={S.app.signOut} onPress={() => bm.signOut()} />
              </View>
            </>
          ) : (
            <View style={styles.chips}>
              <Chip c={c} on label={S.app.signIn} onPress={() => bm.signIn()} />
              {bm.sync === 'error' ? <Text style={[sans(400), styles.small, { color: c.red, alignSelf: 'center' }]}>{S.app.syncFail}</Text> : null}
            </View>
          )}
        </>
      ) : null}

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
  lbl: { fontSize: 13.5, alignSelf: 'center', minWidth: 120 },
});
