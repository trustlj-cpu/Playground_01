// UI strings. site.json is generated from the website (scripts/from-site.js i18n) so labels
// match the web exactly; APP holds the few strings that exist only in the app.
import { APP } from './app';
import SITE from './site.json';

type Dict = Record<string, any>;
const S = SITE as unknown as { popup: Dict; ui: Dict; breaking: Dict; infl: Dict };

const base = (l: string) => String(l || 'en').split('-')[0];
const pickLang = <T,>(m: Record<string, T>, l: string): T | undefined => m[l] ?? m[base(l)] ?? m.en;

export interface PopupLabels {
  what: string;
  why: string;
  me: string;
  two: string;
  say: string;
  a: string;
  b: string;
  src: string;
  here: string;
}

export function popupLabels(region: string, lang: string): PopupLabels {
  return (S.popup[`${region}:${lang}`] || S.popup[lang] || S.popup[base(lang)] || S.popup.en) as PopupLabels;
}

export function breakingLabel(lang: string): string {
  return pickLang(S.breaking as Record<string, string>, lang) || 'BREAKING';
}

export function inflLabels(lang: string): [string, string, string] {
  return (pickLang(S.infl as Record<string, [string, string, string]>, lang) || ['Influencer watch', 'Source', '']) as [string, string, string];
}

export interface Strings {
  latest: string;
  archive: string;
  glossary: string;
  settings: string;
  langname: string;
  account: Dict;
  glossaryPage: Dict;
  settingsPage: Dict;
  app: Dict;
}

export function strings(lang: string): Strings {
  const ui = S.ui[lang] || S.ui[base(lang)] || {};
  const en = S.ui.en;
  const merge = (k: string) => ({ ...(en[k] || {}), ...(ui[k] || {}) });
  return {
    latest: ui.latest || en.latest,
    archive: ui.archive || en.archive,
    glossary: ui.glossary || en.glossary,
    settings: ui.settings || en.settings,
    langname: ui.langname || lang,
    account: merge('account'),
    glossaryPage: merge('glossaryPage'),
    settingsPage: merge('settingsPage'),
    app: { ...APP.en, ...(APP[lang] || APP[base(lang)] || {}) } as Dict,
  };
}

export function langName(lang: string): string {
  const ui = S.ui[lang] || S.ui[base(lang)];
  return (ui && ui.langname) || lang;
}

export const fmt = (s: string, vars: Record<string, string | number>) => s.replace(/\{(\w+)\}/g, (_, k) => String(vars[k] ?? ''));
