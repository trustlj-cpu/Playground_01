import AsyncStorage from '@react-native-async-storage/async-storage';
import { getLocales } from 'expo-localization';
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useColorScheme } from 'react-native';
import { warnWrite } from './cacheStore';
import { editionForLocale } from './locale';
import { dark, light, Palette } from './theme';

export type ThemeMode = 'system' | 'light' | 'dark';

export interface Settings {
  region: string;
  lang: string;
  textScale: number; // 0.85 … 1.3 (same range as the website's text-size slider)
  theme: ThemeMode;
  intro: boolean; // opening animation (typewriter masthead) once per cold start
  introSound: boolean; // its typewriter sounds
}

const KEY = 'dd.settings.v1';

/** First run: the device locale decides the edition and reading language (src/lib/locale.ts). */
export function firstRunDefaults(): Settings {
  let ed = { region: 'US', lang: 'en' };
  try {
    const l = getLocales()[0];
    ed = editionForLocale(l?.languageCode, l?.regionCode, l?.languageScriptCode);
  } catch {}
  return { ...ed, textScale: 1, theme: 'system', intro: true, introSound: true };
}

/** Stored settings over the defaults, field by field: a value of the wrong type (older app version,
 *  damaged storage) keeps the default instead of turning every font size into NaN. */
export function sanitize(base: Settings, v: unknown): Settings {
  if (!v || typeof v !== 'object') return base;
  const o = v as Record<string, unknown>;
  const out = { ...base };
  if (typeof o.region === 'string' && o.region) out.region = o.region;
  if (typeof o.lang === 'string' && o.lang) out.lang = o.lang;
  if (typeof o.textScale === 'number' && isFinite(o.textScale)) out.textScale = Math.min(1.3, Math.max(0.85, o.textScale));
  if (o.theme === 'system' || o.theme === 'light' || o.theme === 'dark') out.theme = o.theme;
  if (typeof o.intro === 'boolean') out.intro = o.intro;
  if (typeof o.introSound === 'boolean') out.introSound = o.introSound;
  return out;
}

interface Ctx {
  settings: Settings;
  ready: boolean;
  update: (patch: Partial<Settings>) => void;
  colors: Palette;
}

const SettingsContext = createContext<Ctx | null>(null);

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<Settings>(firstRunDefaults);
  const [ready, setReady] = useState(false);
  const scheme = useColorScheme();

  useEffect(() => {
    AsyncStorage.getItem(KEY)
      .then((raw) => {
        if (raw) setSettings((s) => sanitize(s, JSON.parse(raw)));
      })
      .catch(() => {})
      .finally(() => setReady(true));
  }, []);

  const update = useCallback((patch: Partial<Settings>) => {
    setSettings((s) => {
      const next = { ...s, ...patch };
      AsyncStorage.setItem(KEY, JSON.stringify(next)).catch(warnWrite('settings'));
      return next;
    });
  }, []);

  const colors = useMemo(() => {
    const mode = settings.theme === 'system' ? (scheme === 'dark' ? 'dark' : 'light') : settings.theme;
    return mode === 'dark' ? dark : light;
  }, [settings.theme, scheme]);

  const value = useMemo(() => ({ settings, ready, update, colors }), [settings, ready, update, colors]);
  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}

export function useSettings(): Ctx {
  const c = useContext(SettingsContext);
  if (!c) throw new Error('SettingsProvider missing');
  return c;
}

export const useColors = () => useSettings().colors;
