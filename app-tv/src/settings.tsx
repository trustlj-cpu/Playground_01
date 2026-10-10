// TV settings, persisted on the device (AsyncStorage). Dark is the default on TV; "paper" is the light newsprint palette.
import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { dark, light, Palette } from './shared/theme';

export interface TVSettings {
  region: string;
  lang: string;
  theme: 'dark' | 'paper';
  /** seconds of inactivity on Home before the lean-back headline cycle starts; 0 = off */
  ambient: number;
  intro: boolean;
  introSound: boolean;
}

const KEY = 'dd.tv.settings.v1';
export const AMBIENT_CHOICES = [0, 30, 60, 120, 300];

// The 17 editions and their languages (index.json; the index is re-checked once it loads).
const REGIONS: Record<string, string[]> = {
  KR: ['ko', 'en', 'ja'], US: ['en', 'ko', 'ja'], JP: ['ja', 'en', 'ko'], GB: ['en', 'ko', 'ja'],
  DE: ['de', 'en', 'ko', 'ja'], FR: ['fr', 'en', 'ko', 'ja'], IN: ['en', 'ko', 'ja', 'hi'], AU: ['en', 'ko', 'ja'],
  CA: ['en', 'ko', 'ja', 'fr'], TW: ['zh-TW', 'en', 'ko', 'ja'], SG: ['en', 'ko', 'ja'], BR: ['pt', 'en', 'ko', 'ja'],
  MX: ['es', 'en', 'ko', 'ja'], IT: ['it', 'en', 'ko', 'ja'], ES: ['es', 'en', 'ko', 'ja'], NL: ['nl', 'en', 'ko', 'ja'],
  CH: ['de', 'en', 'ko', 'ja', 'fr', 'it'],
};
// language only (no usable country in the locale) → its home edition
const BY_LANG: Record<string, string> = { ko: 'KR', ja: 'JP', en: 'US', de: 'DE', fr: 'FR', hi: 'IN', zh: 'TW', pt: 'BR', es: 'ES', it: 'IT', nl: 'NL' };

/** Device locale → edition + language, e.g. en-GB → GB/en, de-CH → CH/de, fr-CA → CA/fr, zh-Hant-TW → TW/zh-TW, es-MX → MX/es. */
export function editionForLocale(locale: string): { region: string; lang: string } {
  const parts = (locale || 'en').replace(/_/g, '-').split('-');
  const lang = parts[0].toLowerCase();
  const country = parts.slice(1).find((p) => /^[A-Za-z]{2}$/.test(p))?.toUpperCase();
  const region = country && REGIONS[country] ? country : BY_LANG[lang] || 'US';
  const langs = REGIONS[region];
  const l = langs.find((x) => x === lang || x.split('-')[0] === lang) || langs[0];
  return { region, lang: l };
}

/** First run: the device locale picks the edition (all 17 regions). Dark display, lean-back after 60 s, intro on, sound off. */
export function firstRunDefaults(): TVSettings {
  let locale = 'en-US';
  try {
    locale = Intl.DateTimeFormat().resolvedOptions().locale || locale;
  } catch {}
  return { ...editionForLocale(locale), theme: 'dark', ambient: 60, intro: true, introSound: false };
}

interface Ctx {
  settings: TVSettings;
  ready: boolean;
  update: (patch: Partial<TVSettings>) => void;
  colors: Palette;
}

const SettingsContext = createContext<Ctx | null>(null);

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<TVSettings>(firstRunDefaults);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(KEY)
      .then((raw) => {
        if (raw) setSettings((s) => ({ ...s, ...JSON.parse(raw) }));
      })
      .catch(() => {})
      .finally(() => setReady(true));
  }, []);

  const update = useCallback((patch: Partial<TVSettings>) => {
    setSettings((s) => {
      const next = { ...s, ...patch };
      AsyncStorage.setItem(KEY, JSON.stringify(next)).catch(() => {});
      return next;
    });
  }, []);

  const colors = settings.theme === 'paper' ? light : dark;
  const value = useMemo(() => ({ settings, ready, update, colors }), [settings, ready, update, colors]);
  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}

export function useSettings(): Ctx {
  const c = useContext(SettingsContext);
  if (!c) throw new Error('SettingsProvider missing');
  return c;
}

export const useColors = () => useSettings().colors;
