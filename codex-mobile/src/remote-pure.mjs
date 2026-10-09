// 네트워크·플러그인 없이 테스트 가능한 순수 함수들 (remote.mjs가 사용)
export const SITE = 'https://dailydropnewspaper.com';
export const FEED = 'https://feed.dailydrop.kr';
// 국가판: 각 판은 그 나라 국내 뉴스 + 글로벌 뉴스. KR은 루트, US/JP는 /us/ /jp/ 아래. 앱 셸 문구는 당분간 한국어.
export const REGIONS = { KR: { prefix: '', lang: 'ko', label: '한국판' }, US: { prefix: 'us/', lang: 'en', label: '미국판' }, JP: { prefix: 'jp/', lang: 'ja', label: '일본판' } };
export const regionIndexUrl = region => `${SITE}/${REGIONS[region]?.prefix || ''}editions.json`;
// 기기 언어로 기본 판을 고른다: 일본어→JP, 영어→US, 그 외(한국어 포함)→KR. 설정에서 바꾸면 그 값이 우선.
// 기기 언어로 첫 판 고르기: 한국어=한국판, 일본어=일본판, 그 밖의 언어(앱에 그 나라 판이 없음)=미국판. 언어 정보가 없으면 한국판.
export function defaultRegion(locale) { const l = String(locale || '').toLowerCase(); if (!l || l.startsWith('ko')) return 'KR'; if (l.startsWith('ja')) return 'JP'; return 'US'; }

// 번들(앱에 포함) + 원격(editions.json) 목록을 날짜 기준으로 합친다. 번들이 우선, 원격 전용은 source:'remote'.
export function mergeEditions(bundled, remote, region = 'KR') {
  const out = new Map(); const prefix = REGIONS[region]?.prefix || '';
  for (const e of bundled || []) if (/^\d{4}-\d{2}-\d{2}$/.test(e.date)) out.set(e.date, { ...e, region, source: 'bundle' });
  for (const e of remote || []) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(e.date) || out.has(e.date)) continue;
    const html = typeof e.html === 'string' && e.html.startsWith(SITE + '/') ? e.html : `${SITE}/${prefix}${e.date}/index.html`;
    const translations = {}; for (const [l, t] of Object.entries(e.translations || {})) { const th = t && typeof t.html === 'string' ? t.html : null; if (th && th.startsWith(SITE + '/') && /^[a-z]{2}$/.test(l)) translations[l] = th; }
    out.set(e.date, { date: e.date, no: Number(e.no) || 0, blurb: String(e.blurb || ''), html, region, source: 'remote', translations });
  }
  return [...out.values()].sort((a, b) => a.date.localeCompare(b.date));
}

// 원격 호 HTML을 앱 안에서 열 수 있게 손본다: 외부 폰트 링크 제거, 사이트 내부 링크를 절대 주소로(앱이 가로채 외부/호 이동 처리), CSP, frame.js 주입
// 앱 안(iframe)에서만 적용되는 호 상단 압축 CSS. 사이트 메뉴·지표 귀(ears)·안내문은 숨기고
// 제호 한 줄 + 얇은 날짜줄만 남겨 첫 기사가 바로 보이게 한다(NYT식). 사이트(dailydrop.kr) 자체는 그대로.
export const IN_APP_CSS = `<style id="dd-inapp">
.dd-nav{display:none!important}
body{padding-top:0!important}
.sheet{padding-top:6px!important}
.sheet>header .mast h1{font-size:clamp(44px,12.5vw,60px)}
.sheet>header .ears{padding-bottom:6px}
</style>`;

export function transformEditionHtml(html, frameSrc) {
  let h = String(html || '');
  h = h.replace(/<link[^>]*href="https:\/\/fonts\.googleapis\.com[^>]*>/g, '');
  h = h.replace(/href="\/(?!\/)/g, `href="${SITE}/`);
  h = h.replace(/<meta http-equiv="Content-Security-Policy"[^>]*>/g, '');
  const csp = `<meta http-equiv="Content-Security-Policy" content="default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self' data:; connect-src https://dailydropnewspaper.com https://dailydrop.kr; object-src 'none'; base-uri 'none'">`;
  h = h.includes('</head>') ? h.replace('</head>', csp + IN_APP_CSS + '</head>') : csp + IN_APP_CSS + h;
  const inj = `<script src="${frameSrc}"></script>`;
  h = h.includes('</body>') ? h.replace('</body>', inj + '</body>') : h + inj;
  return h;
}

// https://dailydropnewspaper.com/2026-10-07/ → '2026-10-07', 루트 → 'latest'; 국가판은 'US:2026-10-08' / 'JP:latest' 꼴; 그 외/다른 호스트 → null
export function parseEditionUrl(url) {
  try {
    const u = new URL(url);
    if (u.protocol !== 'https:' || !['dailydropnewspaper.com', 'www.dailydropnewspaper.com', 'dailydrop.kr', 'www.dailydrop.kr'].includes(u.hostname)) return null; // 앱링크 설정과 동일한 호스트만
    const m = u.pathname.match(/^\/(?:(us|jp)\/)?(\d{4}-\d{2}-\d{2})\/?$/); // 날짜 경로 전체 일치(…/2026-10-07/foo 는 제외)
    if (m) return m[1] ? `${m[1].toUpperCase()}:${m[2]}` : m[2];
    const r = u.pathname.match(/^\/(us|jp)\/?$/); if (r) return `${r[1].toUpperCase()}:latest`;
    return (u.pathname === '/' || u.pathname === '') ? 'latest' : null;
  } catch { return null; }
}

export const editionFilePath = (date, region = 'KR', lang = null) => `editions/${region === 'KR' ? '' : region.toLowerCase() + '-'}${date}${lang ? '.' + lang : ''}.html`;
// 기기 언어 → 번역 대상 언어(ko/en/ja), 그 판의 원어와 같으면 번역 불필요
export const targetLang = (locale = 'ko') => { const l = String(locale || '').toLowerCase().slice(0, 2); return ['ko', 'en', 'ja'].includes(l) ? l : 'en'; };
export const REGION_LANG = { KR: 'ko', US: 'en', JP: 'ja' };
export const translationFor = (edition, lang) => edition && edition.translations && REGION_LANG[edition.region || 'KR'] !== lang ? edition.translations[lang] || null : null;
