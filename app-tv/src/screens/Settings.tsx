// Settings = the web settings page (site/public/settings: h1, h2 sections, .crow edition list, .tmode
// segmented buttons, .mute notes), scaled. TV-only rows (lean-back delay, opening) reuse the same .tmode
// control. Every choice is saved on the device and applies immediately.
import Constants from 'expo-constants';
import React from 'react';
import { ScrollView, Text, View } from 'react-native';
import { availableLangs, regionName } from '../shared/content';
import { langName } from '../shared/i18n';
import { API_BASE, USE_FIXTURES } from '../shared/api';
import { sans, serif } from '../shared/theme';
import type { Index, Region } from '../shared/types';
import { tvStrings } from '../strings';
import { AMBIENT_CHOICES, useColors, useSettings } from '../settings';
import Focusable from '../tv/Focusable';
import { useBack } from '../tv/remote';
import { useWeb } from '../tv/web';

const flag = (cc: string) => String.fromCodePoint(...[...cc.toUpperCase()].map((ch) => 0x1f1e6 + ch.charCodeAt(0) - 65));

function H2({ children, lang }: { children: React.ReactNode; lang: string }) {
  const c = useColors();
  const w = useWeb();
  // h2{font-size:18px;margin:28px 0 10px;border-bottom:1px solid var(--rule);padding-bottom:6px}
  return <Text style={[serif(lang, 700), { fontSize: w.fs(18), marginTop: w.px(28), marginBottom: w.px(10), borderBottomWidth: w.hair, borderBottomColor: c.rule3, paddingBottom: w.px(6), color: c.head }]}>{children}</Text>;
}

function Note({ children }: { children: React.ReactNode }) {
  const c = useColors();
  const w = useWeb();
  return <Text style={[sans(400), { fontSize: w.fs(13), lineHeight: w.fs(13) * 1.5, color: c.mute, marginBottom: w.px(6) }]}>{children}</Text>;
}

/** .tmode{display:flex;border:1px solid var(--ink);max-width:420px} button{13px;padding:9px 6px;border-left:1px solid var(--ink)} [aria-checked]{ink bg, paper text, 700} */
function TMode<T extends string | number | boolean>({ items, value, onPick, lang, id, autoFocusOn }: { items: { v: T; label: string }[]; value: T; onPick: (v: T) => void; lang: string; id: string; autoFocusOn?: boolean }) {
  const c = useColors();
  const w = useWeb();
  const f = w.fs(13);
  return (
    <View style={{ flexDirection: 'row', borderWidth: w.hair, borderColor: c.ink, maxWidth: Math.max(w.px(420), items.length * w.px(110)), marginTop: w.px(10), marginBottom: w.px(6) }}>
      {items.map((it, i) => {
        const on = it.v === value;
        return (
          <View key={String(it.v)} style={{ flex: 1, borderLeftWidth: i ? w.hair : 0, borderLeftColor: c.ink }}>
            <Focusable onPress={() => onPick(it.v)} autoFocus={autoFocusOn && on} testID={`${id}-${String(it.v)}`} style={{ backgroundColor: on ? c.ink : 'transparent', paddingVertical: w.px(9), paddingHorizontal: w.px(6) }}>
              <Text style={[serif(lang, on ? 700 : 400), { fontSize: f, color: on ? c.paper : c.ink, textAlign: 'center' }]} numberOfLines={1}>
                {it.label}
              </Text>
            </Focusable>
          </View>
        );
      })}
    </View>
  );
}

function CRow({ r, on, lang, cur, onPress, last }: { r: Region; on: boolean; lang: string; cur: string; onPress: () => void; last: boolean }) {
  const c = useColors();
  const w = useWeb();
  const city = (r.tz || '').split('/').pop()?.replace(/_/g, ' ') || '';
  // .crow{grid 28px 1fr auto;padding:10px 12px;border:1px solid var(--rule-2);border-bottom:0} .on{border-color:var(--ink);inset 1px ink}
  return (
    <Focusable onPress={onPress} autoFocus={on} testID={'region-' + r.code} label={regionName(r, lang)}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: w.px(12), paddingVertical: w.px(10), paddingHorizontal: w.px(12), borderWidth: on ? w.hair * 2 : w.hair, borderColor: on ? c.ink : c.rule2, borderBottomWidth: last || on ? (on ? w.hair * 2 : w.hair) : 0 }}>
        <Text style={{ fontSize: w.fs(22), width: w.px(28) }}>{flag(r.code)}</Text>
        <View style={{ flex: 1 }}>
          <Text style={[serif(lang, 700), { fontSize: w.fs(15), lineHeight: w.fs(15) * 1.3, color: c.ink }]}>
            {regionName(r, lang)}
            {r.name[r.langs[0]] && r.name[r.langs[0]] !== regionName(r, lang) ? <Text style={[serif(lang), { fontSize: w.fs(12), color: c.mute }]}>{'  ' + r.name[r.langs[0]]}</Text> : null}
          </Text>
          <Text style={[serif(lang), { fontSize: w.fs(12), color: c.mute }]}>
            {city} · {availableLangs(r).map(langName).join(' · ')}
          </Text>
        </View>
        {on && <Text style={[sans(700), { fontSize: w.fs(10.5), letterSpacing: w.ls(0.14, w.fs(10.5)), color: c.red }]}>{cur}</Text>}
      </View>
    </Focusable>
  );
}

export default function Settings({ index, onClose }: { index: Index | null; onClose: () => void }) {
  const c = useColors();
  const w = useWeb();
  const { settings: st, update } = useSettings();
  const S = tvStrings(st.lang);
  useBack(() => {
    onClose();
    return true;
  });
  const region = index?.regions.find((r) => r.code === st.region) || index?.regions[0];
  const sp = S.settingsPage;
  const langs = region ? availableLangs(region) : [st.lang]; // only languages the region actually publishes in
  const ambLabel = (n: number) => (n === 0 ? S.app.off : n < 60 ? S.tv.sec.replace('{n}', String(n)) : S.tv.min.replace('{n}', String(n / 60)));
  const version = Constants.expoConfig?.version || '';
  const modes: string[] = Array.isArray(sp.modes) ? sp.modes : ['System', 'Light', 'Dark'];
  const regions = index?.regions || [];
  const mainW = Math.min(w.px(760), w.CW);
  const L = st.lang;

  return (
    <View style={{ flex: 1, backgroundColor: c.paper }} testID="settings">
      <ScrollView contentContainerStyle={{ paddingHorizontal: w.padX, paddingTop: w.padY, paddingBottom: w.padY + w.px(60), alignItems: 'center' }}>
        <View style={{ width: mainW }}>
          {/* h1{font-size:30px;font-weight:900;letter-spacing:-.03em;line-height:1.25;margin:0 0 6px} */}
          <Text style={[serif(L, 700), { fontSize: w.fs(30), lineHeight: w.fs(30) * 1.25, letterSpacing: w.ls(-0.03, w.fs(30)), color: c.head, marginBottom: w.px(6) }]}>{sp.title || S.settings}</Text>

          <H2 lang={L}>{sp.h}</H2>
          {!!sp.p && <Note>{sp.p}</Note>}
          <View style={{ marginTop: w.px(6) }}>
            {regions.map((r, i) => (
              <CRow
                key={r.code}
                r={r}
                on={r.code === region?.code}
                lang={L}
                cur={sp.cur || ''}
                last={i === regions.length - 1}
                onPress={() => {
                  const al = availableLangs(r);
                  update({ region: r.code, lang: al.includes(st.lang) ? st.lang : al[0] });
                }}
              />
            ))}
          </View>

          <H2 lang={L}>{sp.h2 || S.tv.langs}</H2>
          <TMode id="lang" lang={L} items={langs.map((l) => ({ v: l, label: langName(l) }))} value={st.lang} onPick={(l) => update({ lang: l })} />

          <H2 lang={L}>{sp.hm || S.tv.theme}</H2>
          {!!sp.pm && <Note>{sp.pm}</Note>}
          <TMode
            id="theme"
            lang={L}
            items={[
              { v: 'paper', label: modes[1] || S.tv.paper },
              { v: 'dark', label: modes[2] || S.tv.dark },
            ]}
            value={st.theme}
            onPick={(t) => update({ theme: t as 'paper' | 'dark' })}
          />

          <H2 lang={L}>{S.tv.ambient}</H2>
          <Note>{S.tv.ambientP}</Note>
          <TMode id="ambient" lang={L} items={AMBIENT_CHOICES.map((n) => ({ v: n, label: ambLabel(n) }))} value={st.ambient} onPick={(n) => update({ ambient: n })} />

          <H2 lang={L}>{S.app.intro}</H2>
          <Note>{S.app.introP}</Note>
          <TMode id="intro" lang={L} items={[{ v: true, label: `${S.app.introAnim}: ${S.app.on}` }, { v: false, label: `${S.app.introAnim}: ${S.app.off}` }]} value={st.intro} onPick={(v) => update({ intro: v })} />
          <TMode id="introSound" lang={L} items={[{ v: true, label: `${S.app.introSound}: ${S.app.on}` }, { v: false, label: `${S.app.introSound}: ${S.app.off}` }]} value={st.introSound} onPick={(v) => update({ introSound: v })} />

          <Text style={[sans(400), { fontSize: w.fs(13), lineHeight: w.fs(13) * 1.6, color: c.mute, marginTop: w.px(30) }]}>
            {S.app.aboutApp}
            {'\n'}DailyDrop TV {version} · {USE_FIXTURES ? 'fixtures' : API_BASE}
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}
