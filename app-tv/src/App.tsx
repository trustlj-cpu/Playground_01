// DailyDrop TV — Apple TV (tvOS) and Android TV / Google TV, built with Expo + react-native-tvos.
// Content: the same static JSON API as the website and the phone app, so a web deploy updates the TV too
// (index every 5 min, breaking every 60 s, on returning to the foreground).
import { useFonts } from 'expo-font';
import React, { useEffect, useMemo, useState } from 'react';
import { AppState, View } from 'react-native';
import ErrorBoundary from './components/ErrorBoundary';
import BreakingOverlay from './components/BreakingOverlay';
import GlossaryOverlay from './components/GlossaryOverlay';
import Intro from './components/Intro';
import Ambient from './screens/Ambient';
import Editions from './screens/Editions';
import Home from './screens/Home';
import Reader from './screens/Reader';
import Settings from './screens/Settings';
import { SettingsProvider, useSettings } from './settings';
import { paths } from './shared/api';
import { findRegion, IndexProvider, pickLang, useIndex } from './shared/content';
import { FONT_FILES } from './shared/theme';
import type { BreakingItem, Edition, GlossEntry } from './shared/types';
import { useResource } from './shared/useResource';
import { tvStrings } from './strings';
import { getLastActivity, onActivity, useBack, useRemoteSource } from './tv/remote';

type Screen = { name: 'home' } | { name: 'reader'; story?: string; block?: number } | { name: 'editions' } | { name: 'settings' } | { name: 'ambient' };
type Overlay = null | { kind: 'term'; term: string; entry: GlossEntry } | { kind: 'breaking' };

function Main() {
  useRemoteSource();
  const { settings, update, colors: c } = useSettings();
  const index = useIndex();
  const [screen, setScreen] = useState<Screen>({ name: 'home' });
  const [overlay, setOverlay] = useState<Overlay>(null);
  const [viewDate, setViewDate] = useState<string | null>(null);
  const [focusKey, setFocusKey] = useState<string | null>(null);
  const [introDone, setIntroDone] = useState(false);
  const [ambientFrom, setAmbientFrom] = useState(0);

  const region = findRegion(index.data, settings.region);
  const date = viewDate || region?.latest.date || null;
  const ref = region?.editions.find((e) => e.date === date);
  const lang = region ? pickLang(region, ref, settings.lang) : settings.lang;
  const path = region && date ? paths.edition(region.code, date, lang) : null;
  const ed = useResource<Edition>(path, { keepPrevious: true, pollMs: viewDate ? undefined : 5 * 60_000 });
  const edition = ed.data;
  const brk = useResource<{ items: BreakingItem[] }>(edition?.breaking || null, { pollMs: 60_000, keepPrevious: true });
  const breaking = brk.data?.items || [];

  // region list changed (e.g. the saved region no longer exists): fall back to what the index has
  useEffect(() => {
    if (region && region.code !== settings.region) update({ region: region.code });
  }, [region, settings.region, update]);

  // a past edition that is now the latest → just show Latest
  useEffect(() => {
    if (viewDate && region && viewDate === region.latest.date) setViewDate(null);
  }, [viewDate, region]);

  // Back on Home while reading a past edition returns to Latest
  useBack(() => {
    setViewDate(null);
    return true;
  }, screen.name === 'home' && !!viewDate && !overlay);

  // ── lean-back: idle on Home for N seconds → ambient headlines
  useEffect(() => {
    if (screen.name !== 'home' || overlay || !introDone || !settings.ambient || !edition?.stories.length) return;
    const ms = settings.ambient * 1000;
    let t: ReturnType<typeof setTimeout>;
    const arm = () => {
      clearTimeout(t);
      t = setTimeout(() => {
        if (AppState.currentState === 'active' || AppState.currentState == null) {
          const i = edition.stories.findIndex((s) => 'story-' + s.id === focusKey);
          setAmbientFrom(Math.max(0, i));
          setScreen({ name: 'ambient' });
        } else arm();
      }, Math.max(1000, ms - (Date.now() - getLastActivity())));
    };
    arm();
    const off = onActivity(arm);
    return () => {
      clearTimeout(t);
      off();
    };
  }, [screen.name, overlay, introDone, settings.ambient, edition, focusKey]);

  const S = tvStrings(lang);
  const status = useMemo(() => {
    if (ed.error && ed.data) return S.app.offline;
    if (ed.updatedAt) {
      const d = new Date(ed.updatedAt);
      return `${S.app.updated} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
    }
    return '';
  }, [ed.error, ed.data, ed.updatedAt, S]);

  const story = screen.name === 'reader' && screen.story ? edition?.stories.find((s) => s.id === screen.story) : undefined;
  const block = screen.name === 'reader' && screen.block != null ? edition?.blocks[screen.block] : undefined;

  let body: React.ReactNode;
  if (screen.name === 'reader' && edition && (story || block)) {
    body = <Reader edition={edition} story={story} block={block} overlayOpen={!!overlay} onTerm={(term, entry) => setOverlay({ kind: 'term', term, entry })} onClose={() => setScreen({ name: 'home' })} />;
  } else if (screen.name === 'editions' && region) {
    body = (
      <Editions
        region={region}
        lang={lang}
        current={date || ''}
        onPick={(d) => {
          setViewDate(d === region.latest.date ? null : d);
          setFocusKey(null);
          setScreen({ name: 'home' });
        }}
        onClose={() => setScreen({ name: 'home' })}
      />
    );
  } else if (screen.name === 'settings') {
    body = <Settings index={index.data} onClose={() => setScreen({ name: 'home' })} />;
  } else if (screen.name === 'ambient' && edition) {
    body = <Ambient edition={edition} startAt={ambientFrom} onExit={() => setScreen({ name: 'home' })} />;
  } else {
    body = (
      <Home
        edition={edition}
        region={region?.code || settings.region}
        lang={lang}
        status={status}
        error={!!ed.error || !!index.error}
        breaking={breaking}
        pastNo={viewDate ? edition?.no ?? ref?.no ?? null : null}
        focusKey={focusKey}
        canFocus={introDone && !overlay}
        onFocusKey={setFocusKey}
        onStory={(id) => setScreen({ name: 'reader', story: id })}
        onBlock={(i) => setScreen({ name: 'reader', block: i })}
        onBreaking={() => setOverlay({ kind: 'breaking' })}
        onLatest={() => {
          setViewDate(null);
          setFocusKey(null);
        }}
        onPast={() => setScreen({ name: 'editions' })}
        onSettings={() => setScreen({ name: 'settings' })}
        onRetry={() => {
          index.refresh();
          ed.refresh();
        }}
      />
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: c.paper }}>
      {body}
      {overlay?.kind === 'term' && <GlossaryOverlay term={overlay.term} entry={overlay.entry} lang={lang} onClose={() => setOverlay(null)} />}
      {overlay?.kind === 'breaking' && <BreakingOverlay items={breaking} lang={lang} onClose={() => setOverlay(null)} />}
      {!introDone && <Intro onDone={() => setIntroDone(true)} />}
    </View>
  );
}

function Shell() {
  const { colors, ready } = useSettings();
  const [fontsLoaded, fontError] = useFonts(FONT_FILES);
  const [timedOut, setTimedOut] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setTimedOut(true), 5000);
    return () => clearTimeout(t);
  }, []);
  if (!(ready && (fontsLoaded || !!fontError || timedOut))) return <View style={{ flex: 1, backgroundColor: colors.paper }} />;
  return (
    <IndexProvider>
      <Main />
    </IndexProvider>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <SettingsProvider>
        <Shell />
      </SettingsProvider>
    </ErrorBoundary>
  );
}
