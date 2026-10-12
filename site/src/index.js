// 데일리드롭 사이트 Worker: 정적 자산 서빙 + 호스트 리다이렉트(www·임시 주소 → dailydropnewspaper.com) + 회원·북마크·방문 통계 API(account.js)
import { handleAccount } from './account.js';
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
    // 긴급속보 띠: 피드 Worker의 /breaking.json 을 같은 도메인으로(60초 캐시)
    if (url.pathname === '/api/breaking.json') {
      const q = new URLSearchParams({ region: (url.searchParams.get('region') || 'KR').slice(0, 4), lang: (url.searchParams.get('lang') || '').slice(0, 5) }); const until = (url.searchParams.get('until') || '').slice(0, 30); if (until) q.set('until', until); const ttl = until ? 3600 : 60;
      try { const r = await fetch('https://dailydrop-feed.trustlj.workers.dev/breaking.json?' + q, { cf: { cacheTtl: ttl, cacheEverything: true } }); return new Response(r.body, { status: r.status, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'public, max-age=' + ttl } }); }
      catch (e) { return new Response('{"items":[]}', { status: 502, headers: { 'content-type': 'application/json' } }); }
    }
    // 링크 미리보기 봇(X·페이스북·카톡 등)이 루트(/)를 읽으면 국가판 1면 대신 고정 제목·설명의 카드용 페이지(사람 방문은 그대로 국가판으로)
    if (url.pathname === '/' && /Twitterbot|facebookexternalhit|Facebot|Slackbot|LinkedInBot|Discordbot|TelegramBot|kakaotalk|WhatsApp|Pinterest|redditbot|Applebot/i.test(request.headers.get('user-agent') || '')) {
      const T = 'DailyDrop — the world\'s news, every morning', D = 'One page from 43 countries every morning at 06:00 local time, plus live news confirmed by three or more outlets. Read in your language.';
      return new Response(`<!doctype html><html lang="en"><head><meta charset="utf-8"><title>${T}</title><meta name="description" content="${D}"><link rel="canonical" href="https://dailydropnewspaper.com/"><meta property="og:type" content="website"><meta property="og:site_name" content="DailyDrop"><meta property="og:url" content="https://dailydropnewspaper.com/"><meta property="og:title" content="${T}"><meta property="og:description" content="${D}"><meta property="og:image" content="https://dailydropnewspaper.com/og.png?v=5"><meta property="og:image:width" content="1200"><meta property="og:image:height" content="630"><meta name="twitter:card" content="summary_large_image"><meta name="twitter:title" content="${T}"><meta name="twitter:description" content="${D}"><meta name="twitter:image" content="https://dailydropnewspaper.com/og.png?v=5"></head><body><a href="https://dailydropnewspaper.com/">DailyDrop</a></body></html>`, { headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'public, max-age=3600' } });
    }
    // 지금 중요한 소식(/live/, /live/<id>/): 피드 Worker /top.json 을 받아 서버에서 그린다(5분 캐시). X 글이 가리킬 우리 주소
    const lm = url.pathname.match(/^\/live(?:\/([a-z0-9]{1,10}))?(\/?)$/);
    if (lm) {
      if (!lm[2]) return Response.redirect(url.origin + url.pathname + '/', 301);
      const ck = new Request(url.origin + url.pathname), priv = r => { const o = new Response(r.body, r); o.headers.set('cache-control', 'private, max-age=60'); return o; }, hit = await caches.default.match(ck); if (hit) return priv(hit);
      let d = { items: [] }; try { const r = await fetch('https://dailydrop-feed.trustlj.workers.dev/top.json?lang=en', { cf: { cacheTtl: 300, cacheEverything: true } }); if (r.ok) d = await r.json(); } catch (e) {}
      const res = await livePage(env, url, d, lm[1] || ''); if (res.status === 200 && (d.items || []).length) ctx.waitUntil(caches.default.put(ck, res.clone())); return res.status === 200 ? priv(res) : res;
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

const esc = x => String(x == null ? '' : x).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
function ago(t) { const m = Math.round((Date.now() - Date.parse(t)) / 60000); return !(m >= 0) ? '' : m < 60 ? m + ' min ago' : Math.round(m / 60) + ' h ago'; }
async function livePage(env, url, d, id) {
  const items = d.items || [], one = id ? items.find(i => i.id === id) : null;
  if (id && !one) return Response.redirect(url.origin + '/live/', 302);
  let tpl = ''; try { const r = await env.ASSETS.fetch(new Request(url.origin + '/_art/US.html')); if (r.ok) tpl = await r.text(); } catch (e) {}
  if (!tpl) return new Response('Live page unavailable', { status: 503 });
  const T = one ? one.h : 'Live: what matters now', D = one ? (one.x || 'Reported by ' + one.ns + ' outlets.') : 'Stories reported by three or more outlets in the last few hours, summarised in plain English. Updated every 10 minutes.';
  const U = '/live/' + (one ? one.id + '/' : '');
  const meta = i => `${esc(i.ns)} outlets · ${esc(ago(i.at))}`;
  const st = '<style>@font-face{font-family:"DD Blackletter";font-display:swap;src:url(/brand/nyt-display.woff) format("woff")}.lv .mast{text-align:center;margin:6px 0 4px}.lv .mast a{color:inherit;text-decoration:none;font-family:"DD Blackletter",Georgia,serif;font-size:clamp(40px,8vw,72px);letter-spacing:-.02em;line-height:1}.lv .mast i{font-style:normal;color:var(--red,#c0392b)}.lv h2{font-size:1.2em;line-height:1.35;margin:1.4em 0 .3em;text-wrap:balance}.lv h2 a{color:inherit;text-decoration:none}.lv .lm{opacity:.7;font-size:.85em;margin:.2em 0 0}</style>';
  const body = one
    ? `<main class="lv">${st}<div class="ak">Live · ${meta(one)}</div><h1 class="at">${esc(one.h)}</h1>${one.x ? `<p>${esc(one.x)}</p><p class="lm">Summary based on the headlines of the outlets below. Read their full reports for detail.</p>` : '<p class="lm">Reported by the outlets below. A short summary is being prepared.</p>'}<ul class="as">${(one.u || []).map(u => `<li><a href="${esc(u.u)}" rel="noopener nofollow" target="_blank">${esc(u.s)}</a></li>`).join('')}</ul><p><a class="btn" href="/">Today’s morning edition →</a></p></main>`
    : `<main class="lv">${st}<div class="ak">Live · reported by 3+ outlets · updated every 10 minutes</div><h1 class="at">What matters now</h1>${items.length ? items.map(i => `<h2><a href="/live/${esc(i.id)}/">${esc(i.h)}</a></h2>${i.x ? `<p>${esc(i.x)}</p>` : ''}<p class="lm">${meta(i)}</p>`).join('') : '<p>New stories appear here as soon as three or more outlets report them. Check back in a few minutes.</p>'}<p><a class="btn" href="/">Today’s morning edition →</a></p></main>`;
  const ld = `<script type="application/ld+json">${JSON.stringify({ '@context': 'https://schema.org', '@type': one ? 'NewsArticle' : 'CollectionPage', headline: T, description: D, url: 'https://dailydropnewspaper.com' + U, inLanguage: 'en', ...(one && one.at ? { datePublished: one.at } : {}), image: ['https://dailydropnewspaper.com/og.png?v=5'], publisher: { '@type': 'NewsMediaOrganization', name: 'DailyDrop', url: 'https://dailydropnewspaper.com/' } }).replace(/</g, '\\u003c')}</script>`;
  tpl = tpl.replace(/ aria-current="page"/g, '');
  const html = tpl.split('@@T@@').join(esc(T + ' · DailyDrop')).split('@@D@@').join(esc(D)).split('@@U@@').join(U).split('@@L@@').join(ld).split('@@B@@').join(body);
  return new Response(html, { status: 200, headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'public, max-age=300' } });
}
