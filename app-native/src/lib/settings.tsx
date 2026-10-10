import AsyncStorage from '@react-native-async-storage/async-storage';
import { getLocales } from 'expo-localization';
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useColorScheme } from 'react-native';
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

/** First run: device language decides the edition (ko → KR, ja → JP, otherwise US), like the existing app. */
export function firstRunDefaults(): Settings {
  let code = 'en';
  try {
    code = (getLocales()[0]?.languageCode || 'en').toLowerCase();
  } catch {}
  if (code === 'ko') return { region: 'KR', lang: 'ko', textScale: 1, theme: 'system', intro: true, introSound: true };
  if (code === 'ja') return { region: 'JP', lang: 'ja', textScale: 1, theme: 'system', intro: true, introSound: true };
  return { region: 'US', lang: 'en', textScale: 1, theme: 'system', intro: true, introSound: true };
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
        if (raw) setSettings((s) => ({ ...s, ...JSON.parse(raw) }));
      })
      .catch(() => {})
      .finally(() => setReady(true));
  }, []);

  const update = useCallback((patch: Partial<Settings>) => {
    setSettings((s) => {
      const next = { ...s, ...patch };
      AsyncStorage.setItem(KEY, JSON.stringify(next)).catch(() => {});
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
