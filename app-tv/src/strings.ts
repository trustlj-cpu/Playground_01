// TV-only UI strings (the rest comes from shared/site.json via shared/i18n.ts, so labels match the web).
import { strings as siteStrings } from './shared/i18n';

const TV: Record<string, Record<string, string>> = {
  ko: {
    viewingPast: '지난 호 · 제{n}호 — 뒤로 버튼을 누르면 최신호로 돌아갑니다',
    readerHint: '▲▼ 스크롤   ◀▶ 용어 고르기   OK 뜻 보기   뒤로 닫기',
    readerHintNoTerms: '▲▼ 스크롤   뒤로 닫기',
    termHint: '이 기사의 용어 {n}개 — ◀▶로 고르고 OK',
    ambientHint: '아무 버튼이나 누르면 돌아갑니다',
    ambient: '자동 넘김 화면',
    ambientP: '최신호 화면에서 리모컨을 만지지 않으면 헤드라인을 전체 화면으로 차례로 보여 줍니다.',
    theme: '화면',
    dark: '다크',
    paper: '종이',
    more: '이 호의 다른 면',
    close: '닫기',
    readOnWeb: '전체 기사·링크는 dailydropnewspaper.com 에서',
    sec: '{n}초',
    min: '{n}분',
    latestTag: '최신',
    langs: '언어',
    breakingEmpty: '지금 들어온 속보가 없습니다.',
    termWhy: '이 기사에서는',
  },
  ja: {
    viewingPast: '過去の号 · 第{n}号 — 戻るボタンで最新号に戻ります',
    readerHint: '▲▼ スクロール   ◀▶ 用語を選ぶ   OK 意味   戻る 閉じる',
    readerHintNoTerms: '▲▼ スクロール   戻る 閉じる',
    termHint: 'この記事の用語 {n}件 — ◀▶で選んでOK',
    ambientHint: 'いずれかのボタンで戻ります',
    ambient: 'おまかせ表示',
    ambientP: '最新号の画面でリモコンを操作しないと、見出しを全画面で順番に表示します。',
    theme: '画面',
    dark: 'ダーク',
    paper: '紙',
    more: 'この号のほかの面',
    close: '閉じる',
    readOnWeb: '全文・リンクは dailydropnewspaper.com で',
    sec: '{n}秒',
    min: '{n}分',
    latestTag: '最新',
    langs: '言語',
    breakingEmpty: '現在、速報はありません。',
    termWhy: 'この記事では',
  },
  en: {
    viewingPast: 'Past edition · No. {n} — press Back to return to the latest',
    readerHint: '▲▼ Scroll   ◀▶ Pick a term   OK Define   Back Close',
    readerHintNoTerms: '▲▼ Scroll   Back Close',
    termHint: '{n} terms in this story — ◀▶ then OK',
    ambientHint: 'Press any button to return',
    ambient: 'Lean-back mode',
    ambientP: 'When the remote is left alone on the Latest page, headlines cycle full-screen.',
    theme: 'Display',
    dark: 'Dark',
    paper: 'Paper',
    more: 'More in this edition',
    close: 'Close',
    readOnWeb: 'Full articles and links at dailydropnewspaper.com',
    sec: '{n} s',
    min: '{n} min',
    latestTag: 'Latest',
    langs: 'Languages',
    breakingEmpty: 'No breaking news right now.',
    termWhy: 'In this story',
  },
};

export function tvStrings(lang: string) {
  const base = String(lang || 'en').split('-')[0];
  const S = siteStrings(lang);
  return { ...S, tv: { ...TV.en, ...(TV[lang] || TV[base] || {}) } };
}
