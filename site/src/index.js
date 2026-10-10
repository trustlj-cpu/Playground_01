// 데일리드롭 사이트 Worker: 정적 자산 서빙 + 호스트 리다이렉트(www·임시 주소 → dailydropnewspaper.com) + 회원·북마크·방문 통계 API(account.js)
import { handleAccount } from './account.js';
const CANON = 'dailydropnewspaper.com';
const OLD_HOSTS = new Set(['dailydrop.kr', 'www.dailydrop.kr', 'thedailydrop.today', 'www.thedailydrop.today', 'www.dailydropnewspaper.com']);
const ACCOUNT_API = /^\/api\/(auth\/|me$|bookmarks$|hit$|admin\/)/;
export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    if (url.hostname !== CANON && (OLD_HOSTS.has(url.hostname) || url.hostname.endsWith('.workers.dev'))) {
      url.hostname = CANON; url.protocol = 'https:'; url.port = '';
      return Response.redirect(url.toString(), 301);
    }
    // 회원(로그인·가입·마이페이지)·북마크·방문 비콘·관리자 통계: D1(UDB)
    if (ACCOUNT_API.test(url.pathname)) return handleAccount(request, env, url, ctx);
    // 1면 실시간 시세: 같은 도메인으로 피드 Worker 시세를 전달(20초 캐시). 페이지는 /api/quotes.json 만 부른다.
    if (url.pathname === '/api/quotes.json') {
      try { const r = await fetch('https://dailydrop-feed.trustlj.workers.dev/quotes.json', { cf: { cacheTtl: 20, cacheEverything: true } }); return new Response(r.body, { status: r.status, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'public, max-age=20' } }); }
      catch (e) { return new Response('{"q":{}}', { status: 502, headers: { 'content-type': 'application/json' } }); }
    }
    // 오늘의 단어: 용어 클릭 기록(POST)·순위(GET, 30초 캐시)를 피드 Worker로 전달
    if (url.pathname === '/api/term/hit' && request.method === 'POST') {
      try { const r = await fetch('https://dailydrop-feed.trustlj.workers.dev/term/hit', { method: 'POST', headers: { 'content-type': 'application/json' }, body: (await request.text()).slice(0, 400) }); return new Response(r.body, { status: r.status, headers: { 'content-type': 'application/json' } }); }
      catch (e) { return new Response('{"ok":false}', { status: 502, headers: { 'content-type': 'application/json' } }); }
    }
    if (url.pathname === '/api/term/top') {
      try { const r = await fetch('https://dailydrop-feed.trustlj.workers.dev/term/top' + url.search, { cf: { cacheTtl: 30, cacheEverything: true } }); return new Response(r.body, { status: r.status, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'public, max-age=30' } }); }
      catch (e) { return new Response('{"top":[]}', { status: 502, headers: { 'content-type': 'application/json' } }); }
    }
    // 긴급속보 띠: 피드 Worker의 /breaking.json 을 같은 도메인으로(60초 캐시)
    if (url.pathname === '/api/breaking.json') {
      const q = new URLSearchParams({ region: (url.searchParams.get('region') || 'KR').slice(0, 4), lang: (url.searchParams.get('lang') || '').slice(0, 5) }); const until = (url.searchParams.get('until') || '').slice(0, 30); if (until) q.set('until', until); const ttl = until ? 3600 : 60;
      try { const r = await fetch('https://dailydrop-feed.trustlj.workers.dev/breaking.json?' + q, { cf: { cacheTtl: ttl, cacheEverything: true } }); return new Response(r.body, { status: r.status, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'public, max-age=' + ttl } }); }
      catch (e) { return new Response('{"items":[]}', { status: 502, headers: { 'content-type': 'application/json' } }); }
    }
    // 국가판 라우팅. live.json(빌드 산출물) = 현재 발행 중인 나라 목록 [{code,prefix}].
    // ?r=XX 로 고르면 쿠키(dd_region)에 기억. 쿠키가 없고 루트(/)로 들어오면 접속 국가(Cloudflare cf.country)의 판으로.
    // 그 나라 판이 아직 없으면 한국 접속자는 한국판, 그 외는 영어판(미국판).
    const live = await liveRegions(env, url);
    const country = ((request.cf && request.cf.country) || '').toUpperCase();
    const pick = (url.searchParams.get('r') || '').toUpperCase();
    if (pick && live[pick] !== undefined) {
      url.searchParams.delete('r');
      const h = new Headers({ location: url.pathname + (url.search || '') });
      h.append('set-cookie', `dd_region=${pick}; Path=/; Max-Age=31536000; SameSite=Lax; Secure`);
      return new Response(null, { status: 302, headers: h });
    }
    if (url.pathname === '/' && request.method === 'GET') {
      const cookie = request.headers.get('cookie') || ''; const m = cookie.match(/(?:^|;\s*)dd_region=([A-Z]{2})/);
      const region = m && live[m[1]] !== undefined ? m[1] : live[country] !== undefined ? country : (country === 'KR' || !country ? 'KR' : 'US');
      if (region !== 'KR' && live[region] !== undefined) return withCC(Response.redirect(url.origin + '/' + live[region], 302), country);
    }
    // 예약 발행: schedule.json의 공개 시각(at)이 지난 호가 있으면 그 나라 1면·그 호 페이지(앱 API /app/v1 의 그 호 JSON·index·glossary 포함)를 _sched 사본으로 내보낸다. _sched 직접 접근은 막는다.
    if (url.pathname.startsWith('/_sched/') || url.pathname === '/schedule.json') return new Response('Not found', { status: 404 });
    if (request.method === 'GET') {
      const hit = (await schedule(env, url)).filter(s => s.at <= Date.now() && (url.pathname === '/' + s.prefix || url.pathname === '/' + s.prefix + 'index.html' || url.pathname.startsWith('/' + s.prefix + s.date + '/') || url.pathname === '/' + s.prefix + 'editions.json' || url.pathname === '/app/v1/index.json' || url.pathname.startsWith('/app/v1/glossary/') || url.pathname.startsWith('/app/v1/' + s.key.slice(0, -s.date.length - 1) + '/' + s.date + '.'))).sort((a, b) => b.at - a.at)[0];
      if (hit) {
        const p = url.pathname.replace(/index\.html$/, '');
        const r = await env.ASSETS.fetch(new Request(url.origin + '/_sched/' + hit.key + p));
        if (r.ok) { const h = new Headers(r.headers); h.set('cache-control', 'no-cache'); if (p.endsWith('.json')) h.set('access-control-allow-origin', '*'); return withCC(new Response(r.body, { status: 200, headers: h }), country); }
      }
    }
    const res = await env.ASSETS.fetch(request);
    // 앱·외부에서 읽는 JSON(editions.json 등)은 CORS 허용 + 짧은 캐시
    if (url.pathname === '/.well-known/apple-app-site-association') { const h = new Headers(res.headers); h.set('content-type', 'application/json'); return new Response(res.body, { status: res.status, headers: h }); }
    // 브랜드 자산(종이 질감·로고·로고 폰트)은 모든 페이지가 같이 쓰므로 브라우저에 1주일 캐시 → 판 전환 때 다시 받지 않음
    if (res.ok && url.pathname.startsWith('/brand/')) { const h = new Headers(res.headers); h.set('cache-control', 'public, max-age=604800, stale-while-revalidate=86400'); return new Response(res.body, { status: res.status, headers: h }); }
    if (url.pathname.endsWith('.json')) { const h = new Headers(res.headers); h.set('access-control-allow-origin', '*'); h.set('cache-control', 'public, max-age=120'); return new Response(res.body, { status: res.status, headers: h }); }
    return withCC(res, country);
  },
};

// 접속 국가 코드를 쿠키(dd_cc)로 넘겨 페이지의 국가판 메뉴가 그 나라를 맨 위에 올리게 한다(국가 코드 두 글자만, 정렬에만 사용).
function withCC(res, cc) {
  if (!/^[A-Z]{2}$/.test(cc)) return res;
  const ct = res.headers.get('content-type') || '';
  if (res.status >= 300 && res.status < 400 || ct.includes('text/html')) {
    const r = new Response(res.body, res); r.headers.append('set-cookie', `dd_cc=${cc}; Path=/; Max-Age=86400; SameSite=Lax; Secure`); return r;
  }
  return res;
}

let LIVE = null, LIVE_AT = 0;
async function liveRegions(env, url) {
  if (LIVE && Date.now() - LIVE_AT < 300000) return LIVE;
  try {
    const r = await env.ASSETS.fetch(new Request(url.origin + '/live.json'));
    const list = await r.json(); LIVE = Object.fromEntries(list.map(x => [x.code, x.prefix])); LIVE_AT = Date.now();
  } catch (e) { LIVE = LIVE || { KR: '', US: 'us/', JP: 'jp/' }; }
  return LIVE;
}

let SCHED = null, SCHED_AT = 0;
async function schedule(env, url) {
  if (SCHED && Date.now() - SCHED_AT < 60000) return SCHED;
  try { const r = await env.ASSETS.fetch(new Request(url.origin + '/schedule.json')); SCHED = r.ok ? await r.json() : []; } catch (e) { SCHED = SCHED || []; }
  SCHED_AT = Date.now(); return SCHED;
}
