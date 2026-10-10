// Copied from app-native/src/i18n/index.ts (DailyDrop phone app) for the TV app — keep in sync by hand.
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
    account: '계정',
    accountP: '웹사이트 계정으로 로그인하면 북마크가 웹과 이 기기 사이에 동기화됩니다. 로그인하지 않아도 북마크는 이 기기에 저장됩니다.',
    signIn: '로그인',
    signOut: '로그아웃',
    signedInAs: '{who}(으)로 로그인됨',
    syncing: '동기화 중…',
    synced: '북마크 동기화됨 · {t}',
    syncFail: '동기화하지 못했습니다. 연결되면 다시 시도합니다.',
    syncNow: '지금 동기화',
    intro: '시작 화면',
    introP: '앱을 처음 열 때 제호를 타자기로 찍는 짧은 애니메이션입니다.',
    introAnim: '애니메이션',
    introSound: '타자기 소리',
    on: '켬',
    off: '끔',
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
    account: 'アカウント',
    accountP: 'ウェブサイトのアカウントでログインすると、ブックマークがウェブとこの端末の間で同期されます。ログインしなくてもブックマークはこの端末に保存されます。',
    signIn: 'ログイン',
    signOut: 'ログアウト',
    signedInAs: '{who} でログイン中',
    syncing: '同期中…',
    synced: 'ブックマーク同期済み · {t}',
    syncFail: '同期できませんでした。接続されたら再試行します。',
    syncNow: '今すぐ同期',
    intro: 'オープニング',
    introP: 'アプリを開いたときに題字をタイプライターで打つ短いアニメーションです。',
    introAnim: 'アニメーション',
    introSound: 'タイプライター音',
    on: 'オン',
    off: 'オフ',
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
    account: 'Account',
    accountP: 'Sign in with your website account to sync bookmarks between the web and this device. Without signing in, bookmarks stay on this device.',
    signIn: 'Sign in',
    signOut: 'Sign out',
    signedInAs: 'Signed in as {who}',
    syncing: 'Syncing…',
    synced: 'Bookmarks synced · {t}',
    syncFail: 'Could not sync. Will retry when online.',
    syncNow: 'Sync now',
    intro: 'Opening',
    introP: 'A short animation that types the masthead when the app starts.',
    introAnim: 'Animation',
    introSound: 'Typewriter sound',
    on: 'On',
    off: 'Off',
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

/** Any plain string from the website's ui block (e.g. editionShort "제{n}호 · 아침판", langcode "KOR"). */
export function uiText(lang: string, key: string): string {
  const ui = S.ui[lang] || S.ui[base(lang)] || {};
  const v = ui[key] ?? S.ui.en[key];
  return typeof v === 'string' ? v : '';
}
