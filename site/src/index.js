// 데일리드롭 사이트 Worker: 정적 자산 서빙 + 호스트 리다이렉트(www·임시 주소 → dailydrop.kr)
const CANON = 'dailydrop.kr';
export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.hostname !== CANON && (url.hostname === 'www.' + CANON || url.hostname.endsWith('.workers.dev'))) {
      url.hostname = CANON; url.protocol = 'https:'; url.port = '';
      return Response.redirect(url.toString(), 301);
    }
    return env.ASSETS.fetch(request);
  },
};
