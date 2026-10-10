// DailyDrop TV — Apple TV (tvOS) and Android TV / Google TV, built with Expo + react-native-tvos.
// Content: the same static JSON API as the website and the phone app, so a web deploy updates the TV too
// (index every 5 min, breaking every 60 s, on returning to the foreground).
import { useFonts } from 'expo-font';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
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
import { BreakingFeed } from './shared/breakingStore';
import { findRegion, IndexProvider, pickLang, useIndex } from './shared/content';
import { FONT_FILES } from './shared/theme';
import type { Edition, GlossEntry } from './shared/types';
import { prefetch, useResource } from './shared/useResource';
import { tvStrings } from './strings';
import { idleRemaining } from './tv/activity';
import { getLastActivity, onActivity, useBack, useRemoteSource } from './tv/remote';

/** A new edition (06:00) is swapped in by itself only after this long without remote input on Home
 *  (or while lean-back is showing); otherwise Home shows a "new edition" chip and the reader keeps its paper. */
const AUTO_SWAP_IDLE_MS = 2 * 60_000;

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
  // after a 2 h lean-back session the system screensaver takes over; no new session until the remote is used
  const [ambientSpent, setAmbientSpent] = useState(false);
  // the Latest edition being shown (per region): stays put when a newer one is published while reading
  const [pinned, setPinned] = useState<{ region: string; date: string } | null>(null);

  const region = findRegion(index.data, settings.region);
  const latestDate = region?.latest.date || null;
  const shownLatest = region && pinned?.region === region.code && region.editions.some((e) => e.date === pinned.date) ? pinned.date : latestDate;
  const date = viewDate || shownLatest;
  const ref = region?.editions.find((e) => e.date === date);
  const lang = region ? pickLang(region, ref, settings.lang) : settings.lang;
  const path = region && date ? paths.edition(region.code, date, lang) : null;
  // keyed: data for another path (other region / language / date) is never shown — loading / offline instead
  const ed = useResource<Edition>(path, { pollMs: viewDate ? undefined : 5 * 60_000 });
  const edition = ed.data;
  const newer = !viewDate && region && latestDate && shownLatest !== latestDate ? region.latest : null;

  // first edition for this region → pin it
  useEffect(() => {
    if (region && latestDate && pinned?.region !== region.code) setPinned({ region: region.code, date: latestDate });
  }, [region, latestDate, pinned]);

  const goLatest = useCallback(() => {
    setViewDate(null);
    if (region && latestDate) setPinned({ region: region.code, date: latestDate });
  }, [region, latestDate]);

  // a new edition arrived: swap by itself only when nobody is reading (lean-back, or Home left idle);
  // the new paper is fetched first so the swap never shows a loading screen
  useEffect(() => {
    if (!newer || !region) return;
    const next = paths.edition(region.code, newer.date, pickLang(region, region.editions.find((e) => e.date === newer.date), settings.lang));
    let alive = true;
    const check = async () => {
      const idle = screen.name === 'ambient' || (screen.name === 'home' && !overlay && Date.now() - getLastActivity() >= AUTO_SWAP_IDLE_MS);
      if (!idle || !(await prefetch(next)) || !alive) return;
      setPinned({ region: region.code, date: newer.date });
      if (screen.name === 'home') setFocusKey(null);
    };
    check();
    const t = setInterval(check, 15_000);
    return () => {
      alive = false;
      clearInterval(t);
    };
  }, [newer, region, screen.name, overlay, settings.lang]);

  // region list changed (e.g. the saved region no longer exists): fall back to what the index has
  useEffect(() => {
    if (region && region.code !== settings.region) update({ region: region.code });
  }, [region, settings.region, update]);

  // a past edition that is now the shown latest → just show Latest
  useEffect(() => {
    if (viewDate && region && viewDate === shownLatest) setViewDate(null);
  }, [viewDate, region, shownLatest]);

  // the reader's story is gone (edition changed underneath, e.g. region switched elsewhere): back to Home
  // instead of a Home body under a 'reader' screen state (no Back handler, no lean-back)
  const story = screen.name === 'reader' && screen.story ? edition?.stories.find((s) => s.id === screen.story) : undefined;
  const block = screen.name === 'reader' && screen.block != null ? edition?.blocks[screen.block] : undefined;
  const readerLost = screen.name === 'reader' && !!edition && !story && !block;
  const ambientLost = screen.name === 'ambient' && !edition;
  useEffect(() => {
    if (readerLost || ambientLost) {
      setScreen({ name: 'home' });
      setOverlay(null);
    }
  }, [readerLost, ambientLost]);

  // Back on Home while reading a past edition returns to Latest
  useBack(() => {
    goLatest();
    return true;
  }, screen.name === 'home' && !!viewDate && !overlay);

  useEffect(() => onActivity(() => setAmbientSpent(false)), []);

  // ── lean-back: idle on Home for N seconds → ambient headlines. The idle clock restarts on every key,
  //    focus change and return to the foreground (tv/activity.ts), so coming back never jumps straight in.
  useEffect(() => {
    if (screen.name !== 'home' || overlay || !introDone || !settings.ambient || ambientSpent || !edition?.stories.length) return;
    const ms = settings.ambient * 1000;
    let t: ReturnType<typeof setTimeout>;
    const arm = () => {
      clearTimeout(t);
      t = setTimeout(() => {
        if ((AppState.currentState === 'active' || AppState.currentState == null) && idleRemaining(ms) <= 1000) {
          const i = edition.stories.findIndex((s) => 'story-' + s.id === focusKey);
          setAmbientFrom(Math.max(0, i));
          setScreen({ name: 'ambient' });
        } else arm();
      }, idleRemaining(ms));
    };
    arm();
    const off = onActivity(arm);
    return () => {
      clearTimeout(t);
      off();
    };
  }, [screen.name, overlay, introDone, settings.ambient, ambientSpent, edition, focusKey]);

  const S = tvStrings(lang);
  const status = useMemo(() => {
    if (ed.error && ed.data) return S.app.offline;
    if (ed.updatedAt) {
      const d = new Date(ed.updatedAt);
      return `${S.app.updated} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
    }
    return '';
  }, [ed.error, ed.data, ed.updatedAt, S]);

  let body: React.ReactNode;
  if (screen.name === 'reader' && edition && (story || block)) {
    // the web's popup opens over the front page: Home stays underneath (not focusable), dimmed by the reader's scrim
    body = (
      <>
        {home(false)}
        <Reader edition={edition} story={story} block={block} overlayOpen={!!overlay} onTerm={(term, entry) => setOverlay({ kind: 'term', term, entry })} onClose={() => setScreen({ name: 'home' })} />
      </>
    );
  } else if (screen.name === 'editions' && region) {
    body = (
      <Editions
        region={region}
        lang={lang}
        current={date || ''}
        latest={shownLatest || ''}
        onPick={(d) => {
          if (d === shownLatest) setViewDate(null);
          else if (d === region.latest.date) {
            setViewDate(null);
            setPinned({ region: region.code, date: d });
          } else setViewDate(d);
          setFocusKey(null);
          setScreen({ name: 'home' });
        }}
        onClose={() => setScreen({ name: 'home' })}
      />
    );
  } else if (screen.name === 'settings') {
    body = <Settings index={index.data} onClose={() => setScreen({ name: 'home' })} />;
  } else if (screen.name === 'ambient' && edition) {
    body = (
      <Ambient
        edition={edition}
        startAt={ambientFrom}
        onExit={() => setScreen({ name: 'home' })}
        onExpire={() => {
          setAmbientSpent(true);
          setScreen({ name: 'home' });
        }}
      />
    );
  } else body = <>{home(true)}{null}</>; // same shape as the reader branch: Home keeps its scroll position

  function home(active: boolean) {
    return (
      <Home
        edition={edition}
        region={region?.code || settings.region}
        lang={lang}
        status={status}
        error={!!ed.error || !!index.error}
        offlineNotCached={!!ed.error && !!viewDate}
        newEditionNo={newer ? newer.no : null}
        onNewEdition={() => {
          goLatest();
          setFocusKey(null);
        }}
        pastNo={viewDate ? edition?.no ?? ref?.no ?? null : null}
        focusKey={focusKey}
        canFocus={active && introDone && !overlay}
        onFocusKey={setFocusKey}
        onStory={(id) => setScreen({ name: 'reader', story: id })}
        onBlock={(i) => setScreen({ name: 'reader', block: i })}
        onBreaking={() => {
          setFocusKey('ticker'); // Back from the list returns focus to the ticker
          setOverlay({ kind: 'breaking' });
        }}
        onLatest={() => {
          goLatest();
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
      {overlay?.kind === 'term' && <GlossaryOverlay term={overlay.term} entry={overlay.entry} lang={lang} region={region?.code} onClose={() => setOverlay(null)} />}
      {overlay?.kind === 'breaking' && <BreakingOverlay lang={lang} onClose={() => setOverlay(null)} />}
      <BreakingFeed path={edition?.breaking || null} />
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
