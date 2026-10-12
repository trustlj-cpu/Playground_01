// 데일리드롭 사이트 Worker: 정적 자산 서빙 + 호스트 리다이렉트(www·임시 주소 → dailydropnewspaper.com) + 회원·북마크·방문 통계 API(account.js)
import { handleAccount, currentUser, isAdmin } from './account.js';
const CANON = 'dailydropnewspaper.com';
const OLD_HOSTS = new Set(['dailydrop.kr', 'www.dailydrop.kr', 'thedailydrop.today', 'www.thedailydrop.today', 'www.dailydropnewspaper.com']);
const ACCOUNT_API = /^\/api\/(auth\/|me$|bookmarks$|hit$|admin\/)/;
const handler = {
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
    // 기사 읽어주기(관리자만 — ADMIN_EMAILS + 이메일 인증 계정): 대본·음성은 피드 Worker(Workers AI·D1 캐시)에서 만들어 같은 도메인으로 전달
    if (url.pathname === '/api/tts/script.json' || url.pathname === '/api/tts/audio') {
      const no = (s, c) => new Response(JSON.stringify({ error: c }), { status: s, headers: { 'content-type': 'application/json', 'cache-control': 'no-store' } });
      if (request.method !== 'GET') return no(405, 'method');
      let u = null; try { u = await currentUser(env, request); } catch (e) { u = null; }
      if (!u) return no(401, 'login_required'); if (!(isAdmin(env, u) || u.sub === 1)) return no(403, 'preview_only'); // 관리자 또는 미리보기 계정(users.sub=1, 사장님 10/13 'B')
      const q = new URLSearchParams(); for (const k of ['date', 'story', 'i']) { const v = (url.searchParams.get(k) || '').slice(0, 40); if (v) q.set(k, v); }
      try { const r = await fetch('https://dailydrop-feed.trustlj.workers.dev' + url.pathname.slice(4) + '?' + q); const h = new Headers({ 'content-type': r.headers.get('content-type') || 'application/octet-stream', 'cache-control': r.ok && url.pathname.endsWith('/audio') ? 'private, max-age=86400' : 'no-store' }); if (r.headers.get('content-length')) h.set('content-length', r.headers.get('content-length')); if (r.headers.get('x-tts-cache')) h.set('x-tts-cache', r.headers.get('x-tts-cache')); return new Response(r.body, { status: r.status, headers: h }); }
      catch (e) { return no(502, 'feed'); }
    }
    // 긴급속보 띠: 피드 Worker의 /breaking.json 을 같은 도메인으로(60초 캐시)
    if (url.pathname === '/api/breaking.json') {
      const q = new URLSearchParams({ region: (url.searchParams.get('region') || 'KR').slice(0, 4), lang: (url.searchParams.get('lang') || '').slice(0, 5) }); const until = (url.searchParams.get('until') || '').slice(0, 30); if (until) q.set('until', until); const ttl = until ? 3600 : 60;
      try { const r = await fetch('https://dailydrop-feed.trustlj.workers.dev/breaking.json?' + q, { cf: { cacheTtl: ttl, cacheEverything: true } }); return new Response(r.body, { status: r.status, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'public, max-age=' + ttl } }); }
      catch (e) { return new Response('{"items":[]}', { status: 502, headers: { 'content-type': 'application/json' } }); }
    }
    // 링크 미리보기 봇(X·페이스북·카톡 등)이 루트(/)를 읽으면 국가판 1면 대신 고정 제목·설명의 카드용 페이지(사람 방문은 그대로 국가판으로)
    const BOTS = /Twitterbot|facebookexternalhit|Facebot|Slackbot|LinkedInBot|Discordbot|TelegramBot|kakaotalk|WhatsApp|Pinterest|redditbot|Applebot/i;
    const bq = (url.searchParams.get('b') || '').replace(/[^a-z0-9]/g, '').slice(0, 12);
    if (bq && BOTS.test(request.headers.get('user-agent') || '') && /^\/(?:[a-z]{2}\/)?$/.test(url.pathname)) {
      let it = null; try { const r = await fetch('https://dailydrop-feed.trustlj.workers.dev/breaking/item.json?id=' + bq + '&lang=en', { cf: { cacheTtl: 300, cacheEverything: true } }); if (r.ok) it = await r.json(); } catch (e) {}
      if (it && it.t) { const e2 = x => String(x || '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]); const T = e2(it.t) + ' · DailyDrop', D = e2(it.x || ('Breaking · ' + (it.s || ''))), U = 'https://dailydropnewspaper.com/?b=' + bq;
        return new Response(`<!doctype html><html lang="en"><head><meta charset="utf-8"><title>${T}</title><meta name="description" content="${D}"><link rel="canonical" href="${U}"><meta property="og:type" content="article"><meta property="og:site_name" content="DailyDrop"><meta property="og:url" content="${U}"><meta property="og:title" content="${T}"><meta property="og:description" content="${D}"><meta property="og:image" content="https://dailydropnewspaper.com/og.png?v=5"><meta property="og:image:width" content="1200"><meta property="og:image:height" content="630"><meta name="twitter:card" content="summary_large_image"><meta name="twitter:title" content="${T}"><meta name="twitter:description" content="${D}"><meta name="twitter:image" content="https://dailydropnewspaper.com/og.png?v=5"></head><body><a href="${U}">${T}</a></body></html>`, { headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'public, max-age=600' } }); }
    }
    // 속보 한 건(1면 속보 팝업용): 피드 Worker /breaking/item.json 을 같은 도메인으로
    if (url.pathname === '/api/breaking/item.json') {
      const q = new URLSearchParams({ id: (url.searchParams.get('id') || '').slice(0, 12), lang: (url.searchParams.get('lang') || 'en').slice(0, 5) });
      try { const r = await fetch('https://dailydrop-feed.trustlj.workers.dev/breaking/item.json?' + q, { cf: { cacheTtl: 300, cacheEverything: true } }); return new Response(r.body, { status: r.status, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'public, max-age=300' } }); }
      catch (e) { return new Response('{}', { status: 502, headers: { 'content-type': 'application/json' } }); }
    }
    // 예전 /live/ 페이지는 없앴다(사장님 10/12): 1면으로
    if (/^\/live(\/|$)/.test(url.pathname)) return Response.redirect(url.origin + '/', 301);
    if (url.pathname === '/' && /Twitterbot|facebookexternalhit|Facebot|Slackbot|LinkedInBot|Discordbot|TelegramBot|kakaotalk|WhatsApp|Pinterest|redditbot|Applebot/i.test(request.headers.get('user-agent') || '')) {
      const T = 'DailyDrop — the world\'s news, every morning', D = 'One page from 43 countries every morning at 06:00 local time, plus live news confirmed by three or more outlets. Read in your language.';
      return new Response(`<!doctype html><html lang="en"><head><meta charset="utf-8"><title>${T}</title><meta name="description" content="${D}"><link rel="canonical" href="https://dailydropnewspaper.com/"><meta property="og:type" content="website"><meta property="og:site_name" content="DailyDrop"><meta property="og:url" content="https://dailydropnewspaper.com/"><meta property="og:title" content="${T}"><meta property="og:description" content="${D}"><meta property="og:image" content="https://dailydropnewspaper.com/og.png?v=5"><meta property="og:image:width" content="1200"><meta property="og:image:height" content="630"><meta name="twitter:card" content="summary_large_image"><meta name="twitter:title" content="${T}"><meta name="twitter:description" content="${D}"><meta name="twitter:image" content="https://dailydropnewspaper.com/og.png?v=5"></head><body><a href="https://dailydropnewspaper.com/">DailyDrop</a></body></html>`, { headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'public, max-age=3600' } });
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
      if (region !== 'KR' && live[region] !== undefined) return withCC(Response.redirect(url.origin + '/' + live[region] + (url.searchParams.get('b') ? '?b=' + encodeURIComponent(url.searchParams.get('b')) : ''), 302), country);
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
    // 기사별 페이지(/<prefix><date>/a/<id>/): 그 호의 a.json(예약 발행 규칙을 그대로 따르도록 이 Worker를 다시 거쳐 가져옴)과 나라별 틀(/_art/<나라>.html)로 조립
    const am = request.method === 'GET' && url.pathname.match(/^\/((?:[a-z]{2}\/)?\d{4}-\d\d-\d\d\/)a\/([\w-]+)(\/?)$/);
    if (am) {
      if (!am[3]) return Response.redirect(url.origin + url.pathname + '/' + url.search, 301);
      // 같은 기사는 한 번 조립한 것을 5분간 재사용(엣지 캐시). 200만 저장하므로 공개 전 기사는 저장되지 않는다.
      const ck = new Request(url.origin + url.pathname); const cache = typeof caches !== 'undefined' ? caches.default : null;
      if (cache) { const hit0 = await cache.match(ck); if (hit0) return withCC(hit0, country); }
      const aj = await handler.fetch(new Request(url.origin + '/' + am[1] + 'a.json'), env, ctx);
      if (aj.ok) {
        let J; try { J = await aj.json(); } catch (e) { J = null; }
        const it = J && J.items && J.items[am[2]];
        const tpl = it && await env.ASSETS.fetch(new Request(url.origin + '/_art/' + J.r + '.html'));
        if (tpl && tpl.ok) {
          const html = (await tpl.text()).split('@@T@@').join(it.t).split('@@D@@').join(it.d).split('@@U@@').join(it.u).split('@@L@@').join(it.ld).split('@@B@@').join(it.b);
          const out = new Response(html, { status: 200, headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'public, max-age=300' } });
          if (cache) ctx.waitUntil(cache.put(ck, out.clone()));
          return withCC(out, country);
        }
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
export default handler;

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

