// UI strings. site.json is generated from the website (scripts/from-site.js i18n) so labels
// match the web exactly; APP holds the few strings that exist only in the app.
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

const APP: Record<string, Dict> = {
  ko: {
    bookmarks: '북마크',
    offline: '오프라인 · 저장된 지면',
    updated: '업데이트',
    loadFail: '지면을 불러오지 못했습니다.',
    retry: '다시 시도',
    notCached: '이 호는 아직 이 기기에 저장되지 않았습니다. 인터넷에 연결해 주세요.',
    loading: '불러오는 중…',
    language: '언어',
    region: '국가판',
    current: '최신호',
    termsCount: '용어 {n}개',
    aboutApp: '데일리드롭 앱 · 지면은 웹과 같은 내용으로 자동 업데이트됩니다.',
    noEditionLang: '이 언어로 된 호가 없습니다',
    edNo: '제{n}호',
  },
  ja: {
    bookmarks: 'ブックマーク',
    offline: 'オフライン · 保存した紙面',
    updated: '更新',
    loadFail: '紙面を読み込めませんでした。',
    retry: '再試行',
    notCached: 'この号はまだ端末に保存されていません。インターネットに接続してください。',
    loading: '読み込み中…',
    language: '言語',
    region: '国別版',
    current: '最新号',
    termsCount: '用語 {n}件',
    aboutApp: 'DailyDropアプリ · 紙面はウェブと同じ内容で自動更新されます。',
    noEditionLang: 'この言語の号はありません',
    edNo: '第{n}号',
  },
  en: {
    bookmarks: 'Bookmarks',
    offline: 'Offline · saved edition',
    updated: 'Updated',
    loadFail: 'Could not load the edition.',
    retry: 'Try again',
    notCached: 'This edition is not saved on this device yet. Connect to the internet.',
    loading: 'Loading…',
    language: 'Language',
    region: 'Edition',
    current: 'Latest',
    termsCount: '{n} terms',
    aboutApp: 'DailyDrop app · the paper updates automatically with the website.',
    noEditionLang: 'No edition in this language',
    edNo: 'No. {n}',
  },
};

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
    app: { ...APP.en, ...(APP[lang] || APP[base(lang)] || {}) },
  };
}

export function langName(lang: string): string {
  const ui = S.ui[lang] || S.ui[base(lang)];
  return (ui && ui.langname) || lang;
}

export const fmt = (s: string, vars: Record<string, string | number>) => s.replace(/\{(\w+)\}/g, (_, k) => String(vars[k] ?? ''));
