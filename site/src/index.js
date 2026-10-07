// 데일리드롭 사이트 Worker: 정적 자산 서빙 + 호스트 리다이렉트(www·임시 주소 → dailydrop.kr)
const CANON = 'dailydrop.kr';
export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.hostname !== CANON && (url.hostname === 'www.' + CANON || url.hostname.endsWith('.workers.dev'))) {
      url.hostname = CANON; url.protocol = 'https:'; url.port = '';
      return Response.redirect(url.toString(), 301);
    }
    // 국가판 라우팅: ?r=KR|US|JP 로 선택하면 쿠키에 기억하고 해당 판 첫 화면으로. 쿠키가 없고 루트(/)로 들어오면 접속 국가(Cloudflare cf.country)로 US/JP 판을 먼저 보여준다. 한국·그 외 국가는 한국판.
    const pick = url.searchParams.get('r');
    if (pick && ['KR', 'US', 'JP'].includes(pick.toUpperCase())) {
      const r = pick.toUpperCase(); url.searchParams.delete('r');
      const h = new Headers({ location: url.pathname + (url.search || ''), 'set-cookie': `dd_region=${r}; Path=/; Max-Age=31536000; SameSite=Lax; Secure` });
      return new Response(null, { status: 302, headers: h });
    }
    if (url.pathname === '/' && request.method === 'GET') {
      const cookie = request.headers.get('cookie') || ''; const m = cookie.match(/(?:^|;\s*)dd_region=(KR|US|JP)/);
      const country = (request.cf && request.cf.country) || '';
      const region = m ? m[1] : (country === 'US' ? 'US' : country === 'JP' ? 'JP' : 'KR');
      if (region !== 'KR') return Response.redirect(url.origin + '/' + region.toLowerCase() + '/', 302);
    }
    const res = await env.ASSETS.fetch(request);
    // 앱·외부에서 읽는 JSON(editions.json 등)은 CORS 허용 + 짧은 캐시
    if (url.pathname === '/.well-known/apple-app-site-association') { const h = new Headers(res.headers); h.set('content-type', 'application/json'); return new Response(res.body, { status: res.status, headers: h }); }
    if (url.pathname.endsWith('.json')) { const h = new Headers(res.headers); h.set('access-control-allow-origin', '*'); h.set('cache-control', 'public, max-age=120'); return new Response(res.body, { status: res.status, headers: h }); }
    return res;
  },
};
