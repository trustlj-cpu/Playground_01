// 데일리드롭 사이트 Worker: 정적 자산 서빙 + 호스트 리다이렉트(www·임시 주소 → dailydrop.kr)
const CANON = 'dailydrop.kr';
export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.hostname !== CANON && (url.hostname === 'www.' + CANON || url.hostname.endsWith('.workers.dev'))) {
      url.hostname = CANON; url.protocol = 'https:'; url.port = '';
      return Response.redirect(url.toString(), 301);
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
    const res = await env.ASSETS.fetch(request);
    // 앱·외부에서 읽는 JSON(editions.json 등)은 CORS 허용 + 짧은 캐시
    if (url.pathname === '/.well-known/apple-app-site-association') { const h = new Headers(res.headers); h.set('content-type', 'application/json'); return new Response(res.body, { status: res.status, headers: h }); }
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
