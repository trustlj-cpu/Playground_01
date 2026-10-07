// 네트워크·플러그인 없이 테스트 가능한 순수 함수들 (remote.mjs가 사용)
export const SITE = 'https://dailydrop.kr';
export const FEED = 'https://feed.dailydrop.kr';

// 번들(앱에 포함) + 원격(editions.json) 목록을 날짜 기준으로 합친다. 번들이 우선, 원격 전용은 source:'remote'.
export function mergeEditions(bundled, remote) {
  const out = new Map();
  for (const e of bundled || []) if (/^\d{4}-\d{2}-\d{2}$/.test(e.date)) out.set(e.date, { ...e, source: 'bundle' });
  for (const e of remote || []) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(e.date) || out.has(e.date)) continue;
    const html = typeof e.html === 'string' && e.html.startsWith(SITE + '/') ? e.html : `${SITE}/${e.date}/index.html`;
    out.set(e.date, { date: e.date, no: Number(e.no) || 0, blurb: String(e.blurb || ''), html, source: 'remote' });
  }
  return [...out.values()].sort((a, b) => a.date.localeCompare(b.date));
}

// 원격 호 HTML을 앱 안에서 열 수 있게 손본다: 외부 폰트 링크 제거, 사이트 내부 링크를 절대 주소로(앱이 가로채 외부/호 이동 처리), CSP, frame.js 주입
export function transformEditionHtml(html, frameSrc) {
  let h = String(html || '');
  h = h.replace(/<link[^>]*href="https:\/\/fonts\.googleapis\.com[^>]*>/g, '');
  h = h.replace(/href="\/(?!\/)/g, `href="${SITE}/`);
  h = h.replace(/<meta http-equiv="Content-Security-Policy"[^>]*>/g, '');
  const csp = `<meta http-equiv="Content-Security-Policy" content="default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self'; connect-src 'none'; object-src 'none'; base-uri 'none'">`;
  h = h.includes('</head>') ? h.replace('</head>', csp + '</head>') : csp + h;
  const inj = `<script src="${frameSrc}"></script>`;
  h = h.includes('</body>') ? h.replace('</body>', inj + '</body>') : h + inj;
  return h;
}

// https://dailydrop.kr/2026-10-07/ → '2026-10-07', 루트 → 'latest', 그 외/다른 호스트 → null
export function parseEditionUrl(url) {
  try {
    const u = new URL(url);
    if (u.protocol !== 'https:' || !['dailydrop.kr', 'www.dailydrop.kr'].includes(u.hostname)) return null; // 앱링크 설정과 동일한 호스트만
    const m = u.pathname.match(/^\/(\d{4}-\d{2}-\d{2})\/?$/); // 날짜 경로 전체 일치(…/2026-10-07/foo 는 제외)
    if (m) return m[1];
    return (u.pathname === '/' || u.pathname === '') ? 'latest' : null;
  } catch { return null; }
}

export const editionFilePath = date => `editions/${date}.html`;
