// 데일리드롭 피드 Worker (v1.3 — 읽기 전용 digest 경로, 결정적 클러스터링): 10분 수집분 저장(D1) → 목록 페이지 / JSON / 1시간 취합본
const KST = 9 * 3600 * 1000;
const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const kst = iso => { if (!iso) return ''; const d = new Date(new Date(iso).getTime() + KST); return d.toISOString().slice(5, 16).replace('T', ' '); };
const hourKey = d => new Date(d).toISOString().slice(0, 13); // 'YYYY-MM-DDTHH' (UTC)
const json = (o, status = 200, extra = {}) => new Response(JSON.stringify(o), { status, headers: { 'content-type': 'application/json; charset=utf-8', 'access-control-allow-origin': '*', ...extra } });

import { clusterItems } from './cluster.js';

async function buildHourly(env, hour) { // hour: 'YYYY-MM-DDTHH' UTC · 지난 날짜 채우기(backfill, batch …:bf-XX)는 시간 다이제스트에서 뺀다(한꺼번에 수천 건이 들어와 행 크기 한도 초과)
  const from = hour + ':00:00.000Z', to = new Date(new Date(from).getTime() + 3600_000).toISOString();
  const { results } = await env.DB.prepare("SELECT * FROM items WHERE collected_at >= ?1 AND collected_at < ?2 AND batch NOT LIKE '%:bf-%' ORDER BY collected_at, id").bind(from, to).all();
  const by_field = {}; results.forEach(r => by_field[r.field] = (by_field[r.field] || 0) + 1);
  const srcCount = {}; results.forEach(r => srcCount[r.source] = (srcCount[r.source] || 0) + 1);
  const digest = { hour, hour_kst: kst(from).slice(0, 11) + '시', built_at: new Date().toISOString(), n_items: results.length, by_field,
    sources: Object.entries(srcCount).sort((a, b) => b[1] - a[1]).map(([source, n]) => ({ source, n })),
    clusters: clusterItems(results),
    how_to_use: '콘텐츠 제작 에이전트: clusters 상위부터 검토. 수집 경로 수(n_sources)는 사실 확인이 아니라 우선순위 신호다. 1면 후보로 올리기 전에 반드시 원자료(발표 기관 원문) 또는 서로 다른 취재원의 보도를 직접 대조할 것. 같은 통신사 기사를 받아쓴 매체들은 독립 소스가 아니다.' };
  await env.DB.prepare('INSERT OR REPLACE INTO hourly (hour, built_at, n_items, digest) VALUES (?1, ?2, ?3, ?4)').bind(hour, digest.built_at, results.length, JSON.stringify(digest)).run();
  return digest;
}

const REGION_TABS = [['KR', '🇰🇷', '한국'], ['US', '🇺🇸', '미국'], ['JP', '🇯🇵', '일본'], ['TW', '🇹🇼', '대만'], ['IN', '🇮🇳', '인도'], ['AU', '🇦🇺', '호주'], ['GB', '🇬🇧', '영국'], ['DE', '🇩🇪', '독일'], ['FR', '🇫🇷', '프랑스'], ['CA', '🇨🇦', '캐나다'], ['SG', '🇸🇬', '싱가포르'], ['BR', '🇧🇷', '브라질'], ['MX', '🇲🇽', '멕시코'], ['IT', '🇮🇹', '이탈리아'], ['ES', '🇪🇸', '스페인'], ['NL', '🇳🇱', '네덜란드'], ['CH', '🇨🇭', '스위스'], ['CN', '🇨🇳', '중국'], ['EU', '🇪🇺', 'EU'], ['ME', '🕌', '중동'], ['ASIA', '🌏', '아시아'], ['GLB', '🌐', '국제 공통']];
async function page(env, url) {
  const hours = Math.min(24, Math.max(1, Number(url.searchParams.get('h') || 6)));
  const field = url.searchParams.get('field') || '', region = url.searchParams.get('region') || '';
  const since = new Date(Date.now() - hours * 3600_000).toISOString();
  const where = 'collected_at >= ?1' + (field ? ' AND field = ?2' : '') + (region ? ` AND region = ?${field ? 3 : 2}` : '');
  const q = env.DB.prepare(`SELECT * FROM items WHERE ${where} ORDER BY batch DESC, tier, published_at DESC LIMIT 1500`).bind(since, ...(field ? [field] : []), ...(region ? [region] : []));
  const [{ results }, { results: batches }, { results: fields }, { results: regions }] = await Promise.all([q.all(),
    env.DB.prepare('SELECT * FROM batches ORDER BY batch DESC LIMIT 6').all(),
    env.DB.prepare('SELECT field, COUNT(*) n FROM items WHERE collected_at >= ?1' + (region ? ' AND region = ?2' : '') + ' GROUP BY field ORDER BY n DESC').bind(since, ...(region ? [region] : [])).all(),
    env.DB.prepare("SELECT COALESCE(region,'GLB') region, COUNT(*) n FROM items WHERE collected_at >= ?1" + (field ? ' AND field = ?2' : '') + ' GROUP BY 1').bind(since, ...(field ? [field] : [])).all()]);
  const groups = new Map(); results.forEach(r => { if (!groups.has(r.batch)) groups.set(r.batch, []); groups.get(r.batch).push(r); });
  const qs = (o) => { const p = new URLSearchParams({ h: hours, ...(field ? { field } : {}), ...(region ? { region } : {}), ...o }); for (const [k, v] of [...p]) if (!v) p.delete(k); return '?' + p; };
  const nav = fields.map(f => `<a href="${qs({ field: f.field })}"${f.field === field ? ' class="on"' : ''}>${esc(f.field)} ${f.n}</a>`).join(' ');
  const rc = new Map(regions.map(x => [x.region, x.n]));
  const rnav = REGION_TABS.filter(([c]) => rc.has(c)).map(([c, flag, name]) => `<a href="${qs({ region: c })}"${c === region ? ' class="on"' : ''}>${flag} ${esc(name)} ${rc.get(c)}</a>`).join(' ');
  const last = batches[0];
  let body = '';
  for (const [b, rows] of groups) {
    body += `<h2>${esc(kst(b + ':00Z'))} 회차 <small>${rows.length}건</small></h2><table>` +
      rows.map(r => `<tr><td class=t>${esc(kst(r.published_at) || '—')}</td><td class=f>${esc(r.field)}</td><td class="g g${esc(r.tier)}">${esc(r.tier)}</td><td><a href="${esc(r.link)}" rel="noopener" target="_blank">${esc(r.title)}</a></td><td class=s>${esc(r.source)}</td></tr>`).join('') + '</table>';
  }
  const html = `<!doctype html><html lang="ko"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>데일리드롭 피드</title>
<style>body{font:14px/1.5 -apple-system,"Apple SD Gothic Neo","Malgun Gothic",sans-serif;margin:0;padding:16px;max-width:1100px;margin-inline:auto;color:#111;background:#fff}
h1{font-size:18px;margin:0 0 4px}h2{font-size:14px;margin:22px 0 6px;border-bottom:2px solid #111;padding-bottom:3px}h2 small{color:#777;font-weight:400}
.meta{color:#666;font-size:12.5px}.nav a{display:inline-block;margin:2px 6px 2px 0;color:#333;text-decoration:none;border:1px solid #ccc;padding:1px 7px;border-radius:3px;font-size:12.5px}.nav a.on{background:#111;color:#fff;border-color:#111}.nav{margin-top:4px}.lb{font-size:12px;color:#777;margin-right:4px;font-weight:600}
table{width:100%;border-collapse:collapse}td{padding:4px 6px;border-bottom:1px solid #eee;vertical-align:top}td.t{white-space:nowrap;color:#777;font-variant-numeric:tabular-nums;width:72px}td.f{white-space:nowrap;color:#555;width:70px}td.s{color:#777;white-space:nowrap;font-size:12.5px}
td.g{width:18px;text-align:center;font-weight:700;font-size:12px}.gA{color:#0a6}.gB{color:#06c}.gC{color:#c80}.gD{color:#c33}a{color:#114}
@media(max-width:640px){td.s,td.f{display:none}}</style>
<h1>데일리드롭 피드 <span class=meta>· 10분마다 자동 수집 · 최근 ${hours}시간 ${results.length}건</span></h1>
<div class=meta>마지막 수집 ${last ? esc(kst(last.started_at)) + ` KST · 소스 ${last.n_sources}개 · 신규 ${last.n_new}건` : '아직 없음'} · <a href="/hourly/latest.json">1시간 취합본 JSON</a> · <a href="/items.json">원본 JSON</a> · 창: ${[3, 6, 12, 24].map(h => `<a href="${qs({ h })}">${h}h</a>`).join(' ')}</div>
<div class=nav><b class=lb>분야</b> <a href="${qs({ field: '' })}"${field ? '' : ' class="on"'}>전체</a> ${nav}</div>
<div class=nav><b class=lb>국가판</b> <a href="${qs({ region: '' })}"${region ? '' : ' class="on"'}>전체</a> ${rnav}</div>
<div class=meta>등급 A 공식·1차자료 / B 주요 매체 / C 분석·블로그 / D 커뮤니티·SNS(팩트체크 필수). 제목·링크만 싣고 본문은 옮기지 않습니다.</div>
${body || '<p>아직 수집된 항목이 없습니다.</p>'}
</html>`;
  return new Response(html, { headers: { 'content-type': 'text/html; charset=utf-8' } });
}


// APNs 인증 토큰(ES256 JWT). 키는 Worker 시크릿 APNS_KEY_PEM(.p8 내용)에서만 읽는다.
let _apnsJwt = null;
async function apnsJwt(env) {
  if (_apnsJwt && Date.now() - _apnsJwt.t < 50 * 60_000) return _apnsJwt.v;
  const pem = env.APNS_KEY_PEM.replace(/-----[A-Z ]+-----/g, '').replace(/\s+/g, '');
  const der = Uint8Array.from(atob(pem), c => c.charCodeAt(0));
  const key = await crypto.subtle.importKey('pkcs8', der, { name: 'ECDSA', namedCurve: 'P-256' }, false, ['sign']);
  const b64u = o => btoa(typeof o === 'string' ? o : String.fromCharCode(...new Uint8Array(o))).replace(/=+$/, '').replace(/\+/g, '-').replace(/\//g, '_');
  const head = b64u(JSON.stringify({ alg: 'ES256', kid: env.APNS_KEY_ID })), claims = b64u(JSON.stringify({ iss: env.APNS_TEAM_ID, iat: Math.floor(Date.now() / 1000) }));
  const sig = await crypto.subtle.sign({ name: 'ECDSA', hash: 'SHA-256' }, key, new TextEncoder().encode(head + '.' + claims));
  _apnsJwt = { t: Date.now(), v: head + '.' + claims + '.' + b64u(sig) };
  return _apnsJwt.v;
}

// FCM v1 액세스 토큰(서비스 계정 JSON은 Worker 시크릿 FCM_SERVICE_ACCOUNT에만). RS256 JWT → OAuth2 토큰, 50분 캐시.
let _fcmTok = null;
async function fcmAccessToken(env) {
  if (_fcmTok && Date.now() - _fcmTok.t < 50 * 60_000) return _fcmTok;
  const sa = JSON.parse(env.FCM_SERVICE_ACCOUNT);
  const pem = sa.private_key.replace(/-----[A-Z ]+-----/g, '').replace(/\s+/g, '');
  const der = Uint8Array.from(atob(pem), c => c.charCodeAt(0));
  const key = await crypto.subtle.importKey('pkcs8', der, { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['sign']);
  const b64u = o => btoa(typeof o === 'string' ? o : String.fromCharCode(...new Uint8Array(o))).replace(/=+$/, '').replace(/\+/g, '-').replace(/\//g, '_');
  const now = Math.floor(Date.now() / 1000);
  const head = b64u(JSON.stringify({ alg: 'RS256', typ: 'JWT' })), claims = b64u(JSON.stringify({ iss: sa.client_email, scope: 'https://www.googleapis.com/auth/firebase.messaging', aud: 'https://oauth2.googleapis.com/token', iat: now, exp: now + 3600 }));
  const sig = await crypto.subtle.sign('RSASSA-PKCS1-v1_5', key, new TextEncoder().encode(head + '.' + claims));
  const r = await fetch('https://oauth2.googleapis.com/token', { method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded' }, body: 'grant_type=urn%3Aietf%3Aparams%3Aoauth%3Agrant-type%3Ajwt-bearer&assertion=' + head + '.' + claims + '.' + b64u(sig) });
  if (!r.ok) throw new Error('fcm oauth ' + r.status + ' ' + (await r.text()).slice(0, 200));
  const j = await r.json(); _fcmTok = { t: Date.now(), v: j.access_token, project: sa.project_id }; return _fcmTok;
}

export default {
  async fetch(req, env, ctx) {
    const url = new URL(req.url);
    if (req.method === 'OPTIONS') return new Response(null, { headers: { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*' } });
    if (url.pathname === '/ingest' && req.method === 'POST') {
      if (!env.INGEST_KEY || req.headers.get('authorization') !== 'Bearer ' + env.INGEST_KEY) return json({ error: 'unauthorized' }, 401);
      const p = await req.json(); const now = new Date().toISOString(); const items = (p.items || []).slice(0, 3000);
      let n_new = 0;
      const stmt = env.DB.prepare('INSERT OR IGNORE INTO items (id,title,link,source,field,tier,published_at,collected_at,batch,summary,region,lang) VALUES (?1,?2,?3,?4,?5,?6,?7,?8,?9,?10,?11,?12)');
      for (let i = 0; i < items.length; i += 100) {
        const res = await env.DB.batch(items.slice(i, i + 100).map(it => stmt.bind(it.id, it.title, it.link, it.source, it.field || '기타', it.tier || 'C', it.published_at || null, now, p.batch, it.summary || null, it.region || 'GLB', it.lang || null)));
        res.forEach(r => n_new += r.meta?.changes || 0);
      }
      // 같은 10분 배치에 수집이 두 번 들어와도(Worker dispatch + GitHub schedule 중복) 기록을 덮어쓰지 않고 n_new를 누적, n_fetched는 최대값, errors는 마지막 실행 것
      await env.DB.prepare('INSERT INTO batches (batch,started_at,n_fetched,n_new,n_sources,errors) VALUES (?1,?2,?3,?4,?5,?6) ON CONFLICT(batch) DO UPDATE SET n_new = batches.n_new + excluded.n_new, n_fetched = max(batches.n_fetched, excluded.n_fetched), n_sources = max(batches.n_sources, excluded.n_sources), errors = excluded.errors').bind(p.batch, p.started_at || now, p.n_fetched || items.length, n_new, p.n_sources || 0, JSON.stringify(p.errors || []).slice(0, 4000)).run();
      return json({ ok: true, batch: p.batch, received: items.length, new: n_new });
    }
    // 앱 푸시 토큰 등록/해제(APNs·FCM 발송은 별도 단계). 토큰 외 개인정보 없음. 해제 시 active=0 → 다음 정리 때 삭제.
    if ((url.pathname === '/push/register' || url.pathname === '/push/unregister') && req.method === 'POST') {
      let p; try { p = await req.json(); } catch (e) { return json({ error: 'bad json' }, 400); }
      const token = String(p.token || '').trim(), platform = String(p.platform || '').toLowerCase();
      if (!token || token.length > 512 || !['ios', 'android', 'web'].includes(platform)) return json({ error: 'token/platform required' }, 400);
      const now = new Date().toISOString();
      if (url.pathname === '/push/register') await env.DB.prepare('INSERT INTO push_tokens (token, platform, app_version, created_at, last_seen, active) VALUES (?1, ?2, ?3, ?4, ?4, 1) ON CONFLICT(token) DO UPDATE SET platform = excluded.platform, app_version = excluded.app_version, last_seen = excluded.last_seen, active = 1').bind(token, platform, String(p.app_version || '').slice(0, 40) || null, now).run();
      else await env.DB.prepare('UPDATE push_tokens SET active = 0, last_seen = ?2 WHERE token = ?1').bind(token, now).run();
      return json({ ok: true });
    }
    // 저녁판 발행 푸시. INGEST_KEY 필요. 같은 호(edition)는 한 번만 보냄(push_sends). APNS 시크릿(APNS_KEY_PEM·APNS_KEY_ID·APNS_TEAM_ID) 없으면 skipped.
    if (url.pathname === '/push/send' && req.method === 'POST') {
      if (!env.INGEST_KEY || req.headers.get('authorization') !== 'Bearer ' + env.INGEST_KEY) return json({ error: 'unauthorized' }, 401);
      let p; try { p = await req.json(); } catch (e) { return json({ error: 'bad json' }, 400); }
      const edition = String(p.edition || '').slice(0, 10); if (!/^\d{4}-\d{2}-\d{2}$/.test(edition)) return json({ error: 'edition YYYY-MM-DD required' }, 400);
      const title = String(p.title || '데일리드롭 저녁판').slice(0, 80), body = String(p.body || '').slice(0, 200), link = String(p.url || ('https://dailydrop.kr/' + edition + '/')).slice(0, 300);
      const now = new Date().toISOString();
      const ins = await env.DB.prepare('INSERT OR IGNORE INTO push_sends (edition, sent_at, title) VALUES (?1, ?2, ?3)').bind(edition, now, title).run();
      if (!(ins.meta && ins.meta.changes)) return json({ ok: true, skipped: 'already sent', edition });
      const { results: toks } = await env.DB.prepare("SELECT token, platform FROM push_tokens WHERE active = 1").all();
      const out = { ok: true, edition, ios: { sent: 0, failed: 0, skipped: null }, android: { sent: 0, failed: 0, skipped: null } };
      const ios = toks.filter(t => t.platform === 'ios');
      if (!env.APNS_KEY_PEM || !env.APNS_KEY_ID || !env.APNS_TEAM_ID) out.ios.skipped = 'apns not configured';
      else if (ios.length) {
        const jwt = await apnsJwt(env);
        const host = env.APNS_SANDBOX ? 'https://api.sandbox.push.apple.com' : 'https://api.push.apple.com';
        const payload = JSON.stringify({ aps: { alert: { title, body }, sound: 'default', 'thread-id': 'edition' }, url: link, edition });
        for (const t of ios) {
          try {
            const r = await fetch(host + '/3/device/' + t.token, { method: 'POST', headers: { authorization: 'bearer ' + jwt, 'apns-topic': env.APNS_TOPIC || 'kr.dailydrop.app', 'apns-push-type': 'alert', 'apns-priority': '10', 'apns-expiration': String(Math.floor(Date.now() / 1000) + 6 * 3600), 'content-type': 'application/json' }, body: payload });
            if (r.ok) out.ios.sent++; else { out.ios.failed++; const txt = await r.text(); if (r.status === 410 || /BadDeviceToken|Unregistered/.test(txt)) await env.DB.prepare('UPDATE push_tokens SET active = 0 WHERE token = ?1').bind(t.token).run(); }
          } catch (e) { out.ios.failed++; }
        }
      }
      const and = toks.filter(t => t.platform === 'android');
      if (!env.FCM_SERVICE_ACCOUNT) out.android.skipped = 'fcm not configured';
      else if (and.length) {
        try {
          const tok = await fcmAccessToken(env);
          for (const t of and) {
            try {
              const r = await fetch('https://fcm.googleapis.com/v1/projects/' + tok.project + '/messages:send', { method: 'POST', headers: { authorization: 'Bearer ' + tok.v, 'content-type': 'application/json' }, body: JSON.stringify({ message: { token: t.token, notification: { title, body }, data: { url: link, edition }, android: { priority: 'high', notification: { channel_id: 'edition', click_action: 'OPEN_EDITION' } } } }) });
              if (r.ok) out.android.sent++; else { out.android.failed++; const txt = await r.text(); if (r.status === 404 || /UNREGISTERED|INVALID_ARGUMENT/.test(txt)) await env.DB.prepare('UPDATE push_tokens SET active = 0 WHERE token = ?1').bind(t.token).run(); }
            } catch (e) { out.android.failed++; }
          }
        } catch (e) { out.android.skipped = String(e).slice(0, 200); }
      }
      try { await env.DB.prepare('UPDATE push_sends SET result = ?2 WHERE edition = ?1').bind(edition, JSON.stringify(out).slice(0, 2000)).run(); } catch (e) {}
      return json(out);
    }
    // 긴급속보 띠(사이트 1면): 최근 3시간, 그 판 나라 항목 + 같은 언어의 국제 항목 중 제목에 속보 표시가 있는 것. 최신순 8건, 제목 중복 제거
    if (url.pathname === '/breaking.json') {
      const region = (url.searchParams.get('region') || 'KR').toUpperCase().replace(/[^A-Z]/g, '').slice(0, 4), lang = (url.searchParams.get('lang') || '').toLowerCase().replace(/[^a-z-]/g, '').slice(0, 5);
      // until=ISO(과거 시각)이면 지난 호용: 그 시각 직전 24시간의 속보(고정 자료라 하루 캐시). 없으면 실시간: 최근 6시간
      const untilQ = Date.parse(url.searchParams.get('until') || ''), past = untilQ > 0 && untilQ < Date.now() - 60_000;
      const until = past ? new Date(untilQ).toISOString() : new Date(Date.now() + 60_000).toISOString();
      const since = new Date((past ? untilQ : Date.now()) - (past ? 24 : 6) * 3600_000).toISOString();
      // 머리 표시가 붙은 진짜 속보만(‘record-breaking’·‘urgentes’·야구 속보중 같은 오탐 방지): 제목 앞머리 꼬리표 기준, 스포츠 제외
      const marks = ['[속보]%', '%[속보]%', '속보%', '[긴급]%', '[1보]%', '[2보]%', '[3보]%', '【速報】%', '%【速報】%', '速報：%', 'Breaking:%', 'BREAKING%', 'Breaking news%', 'Just in:%', '%【快訊】%', '%〔快訊〕%', '快訊%', '%突發%', 'Eilmeldung%', '%+++ Eil%', 'Última hora:%', 'ÚLTIMA HORA%', 'URGENTE:%', 'Urgente:%', "Ultim'ora%", 'ULTIM%ORA%', 'Alerte%', 'Plantão%', 'Breaking:%'];
      const where = marks.map((_, i) => `title LIKE ?${i + 4}`).join(' OR ');
      const { results } = await env.DB.prepare(`SELECT title, link, source, published_at, region FROM items WHERE collected_at >= ?1 AND collected_at <= ?${marks.length + 4} AND tier IN ('A','B') AND field != '스포츠' AND (region = ?2 OR (region = 'GLB' AND lang = ?3)) AND (${where}) ORDER BY collected_at DESC LIMIT 40`).bind(since, region, lang || 'xx', ...marks, until).all().catch(() => ({ results: [] }));
      const seen = new Set(), items = [];
      for (const r of results) { const t = String(r.title || '').replace(/^\s*[\[［【(（<〈]?\s*(속보|긴급|[123]보|速報|快訊|突發|breaking|just in|eilmeldung|última hora|urgente|ultim'ora|alerte|plantão)\s*[\]］】)）>〉:：]?\s*/i, '').replace(/\s+[-–|]\s+[^-–|]{2,30}$/, '').trim(); const k = t.toLowerCase().replace(/\W+/g, '').slice(0, 40); if (!t || seen.has(k)) continue; seen.add(k); items.push({ t, u: r.link, s: r.source, at: r.published_at }); if (items.length >= (past ? 12 : 8)) break; }
      return json({ region, at: new Date().toISOString(), past, items }, 200, { 'cache-control': past ? 'public, max-age=86400' : 'public, max-age=60' });
    }
    if (url.pathname === '/items.json') {
      const since = url.searchParams.get('since') || new Date(Date.now() - 6 * 3600_000).toISOString();
      const { results } = await env.DB.prepare('SELECT * FROM items WHERE collected_at >= ?1 ORDER BY collected_at DESC LIMIT 2000').bind(since).all();
      return json({ since, n: results.length, items: results });
    }
    if (url.pathname === '/quotes/refresh' && req.method === 'POST') { if ((req.headers.get('authorization') || '') !== 'Bearer ' + env.INGEST_KEY) return json({ error: 'unauthorized' }, 401); try { const r = await refreshQuotes(env); return json(r); } catch (e) { return json({ error: String(e && e.stack || e).slice(0, 1000) }, 500); } }
    if (url.pathname === '/quotes.json') { const { results } = await env.DB.prepare('SELECT k, v, chg, prev, ts, state, fetched_at FROM quotes').all().catch(() => ({ results: [] })); const q = {}; let up = 0, fx = 0; for (const r of results) { q[r.k] = { v: r.v, chg: r.chg, prev: r.prev, ts: r.ts, state: r.state }; up = Math.max(up, r.ts || 0); fx = Math.max(fx, r.fetched_at || 0); } if (Date.now() - fx > 60_000 && ctx) ctx.waitUntil(refreshQuotes(env).catch(() => {})); return new Response(JSON.stringify({ updated: up, q }), { headers: { 'content-type': 'application/json; charset=utf-8', 'access-control-allow-origin': '*', 'cache-control': 'public, max-age=30' } }); }
    if (url.pathname === '/cron.json') { const { results } = await env.DB.prepare('SELECT * FROM cron_runs ORDER BY id DESC LIMIT 100').all(); return json(results); }
    if (url.pathname === '/batches.json') { const { results } = await env.DB.prepare('SELECT * FROM batches ORDER BY batch DESC LIMIT 144').all(); return json(results); }
    let m = url.pathname.match(/^\/hourly\/(latest|\d{4}-\d{2}-\d{2}T\d{2})\.json$/);
    if (m) {
      const hour = m[1] === 'latest' ? hourKey(Date.now() - 3600_000) : m[1];
      const rebuild = !!url.searchParams.get('rebuild');
      if (m[1] !== 'latest') {
        // 특정 시간대 GET은 읽기 전용: 저장된 것만 돌려주고 없으면 404. 쓰기는 ?rebuild=1 로만.
        if (!rebuild) { const row = await env.DB.prepare('SELECT digest FROM hourly WHERE hour = ?1').bind(hour).first(); return row ? json(JSON.parse(row.digest)) : json({ error: 'no digest stored for ' + hour, hint: 'cron builds it at HH:02; ?rebuild=1 forces a rebuild' }, 404); }
        return json(await buildHourly(env, hour));
      }
      // latest: 저장본 우선, 없으면(크론 전) 계산해 저장
      const row = rebuild ? null : await env.DB.prepare('SELECT digest FROM hourly WHERE hour = ?1').bind(hour).first();
      return json(row ? JSON.parse(row.digest) : await buildHourly(env, hour));
    }
    if (url.pathname === '/hourly' || url.pathname === '/hourly/') { const { results } = await env.DB.prepare('SELECT hour, built_at, n_items FROM hourly ORDER BY hour DESC LIMIT 72').all(); return json(results); }
    if (url.pathname === '/') return page(env, url);
    return json({ error: 'not found', routes: ['/', '/items.json?since=ISO', '/breaking.json?region=XX&lang=xx', 'POST /push/register', 'POST /push/unregister', 'POST /push/send(INGEST_KEY)', '/hourly/latest.json', '/hourly/YYYY-MM-DDTHH.json(?rebuild=1)', '/hourly', '/batches.json', '/cron.json', 'POST /ingest'] }, 404);
  },
  async scheduled(ev, env, ctx) {
    if (ev.cron === '* * * * *') { ctx.waitUntil(refreshQuotes(env).catch(e => env.DB.prepare('INSERT INTO cron_runs (scheduled_at, ran_at, hour, status, n_items, error) VALUES (?1, ?2, ?3, ?4, ?5, ?6)').bind(new Date(ev.scheduledTime).toISOString(), new Date().toISOString(), 'quotes', 'error', null, String(e && e.stack || e).slice(0, 1000)).run().catch(() => {}))); return; }
    // 깃허브 예약 실행 대체: PAT(GH_DISPATCH_TOKEN)이 있을 때만 워크플로를 호출. 없으면 조용히 기록만.
    // GitHub schedule은 기본 브랜치(main)의 워크플로만 실행하므로, paycheck-page에만 있는 issuedrop.yml(KST 06/12/18시 자료보고서)도 여기서 호출한다.
    const DISPATCH = { '*/10 * * * *': { wf: 'codex-feed-schedule.yml', ref: 'main', tag: 'dispatch' }, '0 21,3,9 * * *': { wf: 'issuedrop.yml', ref: 'paycheck-page', tag: 'dispatch:issuedrop' } };
    if (DISPATCH[ev.cron]) {
      const { wf, ref, tag } = DISPATCH[ev.cron];
      ctx.waitUntil((async () => {
        const sched = new Date(ev.scheduledTime).toISOString(); let status = 'skipped(no token)', error = null;
        if (env.GH_DISPATCH_TOKEN) {
          // GitHub가 5xx/네트워크 오류를 돌려주면 2초·5초 뒤 최대 2번 더 시도(15:10 UTC HTTP 500으로 회차 하나가 비었음). 4xx는 재시도 안 함.
          for (let attempt = 0; attempt < 3; attempt++) {
            if (attempt) await new Promise(res => setTimeout(res, attempt === 1 ? 2000 : 5000));
            try {
              const r = await fetch('https://api.github.com/repos/trustlj-cpu/Playground_01/actions/workflows/' + wf + '/dispatches', { method: 'POST', headers: { 'authorization': 'Bearer ' + env.GH_DISPATCH_TOKEN, 'accept': 'application/vnd.github+json', 'user-agent': 'dailydrop-feed-worker', 'content-type': 'application/json' }, body: JSON.stringify({ ref }) });
              if (r.status === 204) { status = attempt ? 'dispatched(retry ' + attempt + ')' : 'dispatched'; error = null; break; }
              status = 'error'; error = 'HTTP ' + r.status + ' ' + (await r.text()).slice(0, 300); if (r.status < 500) break;
            } catch (e) { status = 'error'; error = String(e).slice(0, 500); }
          }
        }
        try { await env.DB.prepare('INSERT INTO cron_runs (scheduled_at, ran_at, hour, status, n_items, error) VALUES (?1, ?2, ?3, ?4, ?5, ?6)').bind(sched, new Date().toISOString(), tag, status, null, error).run(); } catch (e) {}
      })());
      return;
    }
    // 크론 실행 자체를 D1에 기록(대시보드 로그가 꺼져 있어도 실행 여부·오류를 확인할 수 있게)
    const hour = hourKey(ev.scheduledTime - 3600_000);
    ctx.waitUntil((async () => {
      const sched = new Date(ev.scheduledTime).toISOString(); let status = 'ok', error = null, n = null;
      try { const d = await buildHourly(env, hour); n = d.n_items; } catch (e) { status = 'error'; error = String(e && e.stack || e).slice(0, 1000); }
      try { await env.DB.prepare('INSERT INTO cron_runs (scheduled_at, ran_at, hour, status, n_items, error) VALUES (?1, ?2, ?3, ?4, ?5, ?6)').bind(sched, new Date().toISOString(), hour, status, n, error).run(); } catch (e) { /* 기록 실패는 무시 */ }
    })());
  },
};

// ── 1면 시세줄 실시간 연동: 1분마다 공개 시세(야후 파이낸스 차트 API, 지연될 수 있음)를 받아 D1 quotes에 저장.
// 키는 site/markets.json·1면 시세줄과 같은 이름. chg = 지수·원자재는 전일 대비 %, 환율은 절대값(원·엔), 금리는 %p.
const QUOTE_SYMBOLS = {
  sp500: ['^GSPC', 'pctchg'], nasdaq: ['^IXIC', 'pctchg'], dow: ['^DJI', 'pctchg'], us10y: ['^TNX', 'abs'], wti: ['CL=F', 'pctchg'], gold: ['GC=F', 'pctchg'],
  kospi: ['^KS11', 'pctchg'], kosdaq: ['^KQ11', 'pctchg'], usdkrw: ['KRW=X', 'abs'],
  nikkei: ['^N225', 'pctchg'], topix: ['^TOPX', 'pctchg'], usdjpy: ['JPY=X', 'abs'],
  ftse: ['^FTSE', 'pctchg'], dax: ['^GDAXI', 'pctchg'], cac40: ['^FCHI', 'pctchg'], nifty: ['^NSEI', 'pctchg'], asx200: ['^AXJO', 'pctchg'], tsx: ['^GSPTSE', 'pctchg'], taiex: ['^TWII', 'pctchg'], smi: ['^SSMI', 'pctchg'], ftsemib: ['FTSEMIB.MI', 'pctchg'], ibovespa: ['^BVSP', 'pctchg'],
  sti: ['^STI', 'pctchg'], ipc: ['^MXX', 'pctchg'], ibex35: ['^IBEX', 'pctchg'], aex: ['^AEX', 'pctchg'],
  gbpusd: ['GBPUSD=X', 'pctchg'], eurusd: ['EURUSD=X', 'pctchg'], usdinr: ['INR=X', 'pctchg'], audusd: ['AUDUSD=X', 'pctchg'], usdcad: ['CAD=X', 'pctchg'], usdtwd: ['TWD=X', 'pctchg'], usdchf: ['CHF=X', 'pctchg'], usdbrl: ['BRL=X', 'pctchg'],
  usdsgd: ['SGD=X', 'pctchg'], usdmxn: ['MXN=X', 'pctchg'],
};
async function refreshQuotes(env) {
  await env.DB.prepare('CREATE TABLE IF NOT EXISTS quotes (k TEXT PRIMARY KEY, sym TEXT, v REAL, chg REAL, prev REAL, ts INTEGER, state TEXT, src TEXT, err TEXT, fetched_at INTEGER)').run();
  const now = Date.now(); const stmts = [];
  await Promise.all(Object.entries(QUOTE_SYMBOLS).map(async ([k, [sym, mode]]) => {
    try {
      const r = await fetch('https://query1.finance.yahoo.com/v8/finance/chart/' + encodeURIComponent(sym) + '?range=1d&interval=5m', { headers: { 'user-agent': 'Mozilla/5.0 (compatible; DailyDropBot/1.0; +https://dailydrop.kr)' }, cf: { cacheTtl: 30 } });
      if (!r.ok) throw new Error('HTTP ' + r.status);
      const m = (((await r.json()).chart || {}).result || [])[0]?.meta; if (!m || m.regularMarketPrice == null) throw new Error('no meta');
      const v = +m.regularMarketPrice, prev = +(m.chartPreviousClose ?? m.previousClose); if (!isFinite(v) || !isFinite(prev) || !prev) throw new Error('bad numbers');
      const chg = mode === 'abs' ? +(v - prev).toFixed(4) : +((v / prev - 1) * 100).toFixed(2);
      const ts = (m.regularMarketTime || 0) * 1000; const state = m.marketState || (now - ts < 20 * 60_000 ? 'REGULAR' : 'CLOSED');
      stmts.push(env.DB.prepare('INSERT INTO quotes (k, sym, v, chg, prev, ts, state, src, err, fetched_at) VALUES (?1,?2,?3,?4,?5,?6,?7,?8,NULL,?9) ON CONFLICT(k) DO UPDATE SET sym=?2, v=?3, chg=?4, prev=?5, ts=?6, state=?7, src=?8, err=NULL, fetched_at=?9').bind(k, sym, v, chg, prev, ts, state, 'yahoo', now));
    } catch (e) {
      stmts.push(env.DB.prepare('INSERT INTO quotes (k, sym, err, fetched_at) VALUES (?1,?2,?3,?4) ON CONFLICT(k) DO UPDATE SET err=?3, fetched_at=?4').bind(k, sym, String(e).slice(0, 200), now));
    }
  }));
  if (stmts.length) await env.DB.batch(stmts);
  const { results } = await env.DB.prepare('SELECT k, v, chg, err FROM quotes ORDER BY k').all();
  return { at: new Date(now).toISOString(), n: results.length, ok: results.filter(r => r.v != null && !r.err).length, rows: results };
}
