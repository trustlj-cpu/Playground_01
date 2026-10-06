// 데일리드롭 피드 Worker: 10분 수집분 저장(D1) → 목록 페이지 / JSON / 1시간 취합본
const KST = 9 * 3600 * 1000;
const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const kst = iso => { if (!iso) return ''; const d = new Date(new Date(iso).getTime() + KST); return d.toISOString().slice(5, 16).replace('T', ' '); };
const hourKey = d => new Date(d).toISOString().slice(0, 13); // 'YYYY-MM-DDTHH' (UTC)
const json = (o, status = 200, extra = {}) => new Response(JSON.stringify(o), { status, headers: { 'content-type': 'application/json; charset=utf-8', 'access-control-allow-origin': '*', ...extra } });

const STOP = new Set('the a an and or of to in on for with by from at as is are was be this that it its vs via amid after before over under into about says said new will may could would should has have had not no up down out more most less than then 및 등 의 을 를 이 가 은 는 에 에서 로 으로 와 과 도 만 더 또 대한 위한 관련 통해 대해 속보 단독 종합 영상 포토 사진 기자'.split(' '));
const SYN = { '한은': '한국은행', '연준': 'fed', 'fomc': 'fed', '코스피': 'kospi', '美': '미국', '中': '중국', '日': '일본', 'trump': '트럼프', 'bitcoin': '비트코인', 'btc': '비트코인', 'samsung': '삼성전자', '삼성': '삼성전자', 'nvidia': '엔비디아', '소비자물가': '물가', '물가상승률': '물가' };
const normTitle = t => t.replace(/\[.*?\]|\(.*?\)|【.*?】/g, ' ').replace(/\s+[-|–—]\s+[^-|–—]{2,20}$/, '').replace(/\s+/g, ' ').trim().toLowerCase();
const tokens = t => new Set((normTitle(t).match(/[가-힣]{2,}|[A-Za-z][A-Za-z0-9-]{2,}|\d{2,}/g) || []).map(w => SYN[w] || w).filter(w => !STOP.has(w)));
function shared(a, b) { let n = 0; for (const x of a) if (b.has(x)) n++; for (const x of a) if (!b.has(x)) for (const y of b) if (!a.has(y) && (x.includes(y) || y.includes(x)) && Math.abs(x.length - y.length) <= 4) { n++; break; } return n; }

function clusterItems(items) {
  const toks = items.map(i => tokens(i.title)); const parent = items.map((_, i) => i);
  const find = x => { while (parent[x] !== x) { parent[x] = parent[parent[x]]; x = parent[x]; } return x; };
  for (let i = 0; i < items.length; i++) { if (toks[i].size < 2) continue; for (let j = i + 1; j < items.length; j++) { const s = shared(toks[i], toks[j]); if ((s >= 2 && items[i].field === items[j].field) || s >= 3) parent[find(i)] = find(j); } }
  const groups = new Map(); items.forEach((it, i) => { const r = find(i); if (!groups.has(r)) groups.set(r, []); groups.get(r).push(it); });
  const out = [];
  for (const g of groups.values()) {
    const srcs = [...new Set(g.map(x => x.source))]; const ab = new Set(g.filter(x => 'AB'.includes(x.tier)).map(x => x.source));
    const status = ab.size >= 2 ? '복수 수집 경로(A/B ' + ab.size + '곳) — 독립성·사실 확인 필요' : ab.size === 1 ? '단일 수집 경로 — 원자료 확인 필요' : g.some(x => x.tier === 'C') ? '분석/블로그 — 1차 자료 대조 필요' : '미확인(커뮤니티·트렌드) — 팩트체크 필수';
    const kw = new Map(); g.forEach(x => tokens(x.title).forEach(t => kw.set(t, (kw.get(t) || 0) + 1)));
    g.sort((a, b) => a.tier.localeCompare(b.tier) || (b.published_at || '').localeCompare(a.published_at || ''));
    const fieldCount = new Map(); g.forEach(x => fieldCount.set(x.field, (fieldCount.get(x.field) || 0) + 1));
    out.push({ topic: g[0].title, keywords: [...kw.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6).map(e => e[0]), field: [...fieldCount.entries()].sort((a, b) => b[1] - a[1])[0][0], n_items: g.length, n_sources: srcs.length, sources: srcs, tier_best: [...g.map(x => x.tier)].sort()[0], status, items: g.map(x => ({ title: x.title, source: x.source, link: x.link, tier: x.tier, published_at: x.published_at })) });
  }
  out.sort((a, b) => b.n_sources - a.n_sources || b.n_items - a.n_items);
  return out;
}

async function buildHourly(env, hour) { // hour: 'YYYY-MM-DDTHH' UTC
  const from = hour + ':00:00.000Z', to = new Date(new Date(from).getTime() + 3600_000).toISOString();
  const { results } = await env.DB.prepare('SELECT * FROM items WHERE collected_at >= ?1 AND collected_at < ?2 ORDER BY collected_at').bind(from, to).all();
  const by_field = {}; results.forEach(r => by_field[r.field] = (by_field[r.field] || 0) + 1);
  const srcCount = {}; results.forEach(r => srcCount[r.source] = (srcCount[r.source] || 0) + 1);
  const digest = { hour, hour_kst: kst(from).slice(0, 11) + '시', built_at: new Date().toISOString(), n_items: results.length, by_field,
    sources: Object.entries(srcCount).sort((a, b) => b[1] - a[1]).map(([source, n]) => ({ source, n })),
    clusters: clusterItems(results),
    how_to_use: '콘텐츠 제작 에이전트: clusters 상위부터 검토. 수집 경로 수(n_sources)는 사실 확인이 아니라 우선순위 신호다. 1면 후보로 올리기 전에 반드시 원자료(발표 기관 원문) 또는 서로 다른 취재원의 보도를 직접 대조할 것. 같은 통신사 기사를 받아쓴 매체들은 독립 소스가 아니다.' };
  await env.DB.prepare('INSERT OR REPLACE INTO hourly (hour, built_at, n_items, digest) VALUES (?1, ?2, ?3, ?4)').bind(hour, digest.built_at, results.length, JSON.stringify(digest)).run();
  return digest;
}

async function page(env, url) {
  const hours = Math.min(24, Math.max(1, Number(url.searchParams.get('h') || 6)));
  const field = url.searchParams.get('field') || '';
  const since = new Date(Date.now() - hours * 3600_000).toISOString();
  const q = field ? env.DB.prepare('SELECT * FROM items WHERE collected_at >= ?1 AND field = ?2 ORDER BY batch DESC, tier, published_at DESC LIMIT 1500').bind(since, field)
                  : env.DB.prepare('SELECT * FROM items WHERE collected_at >= ?1 ORDER BY batch DESC, tier, published_at DESC LIMIT 1500').bind(since);
  const [{ results }, { results: batches }, { results: fields }] = await Promise.all([q.all(),
    env.DB.prepare('SELECT * FROM batches ORDER BY batch DESC LIMIT 6').all(),
    env.DB.prepare('SELECT field, COUNT(*) n FROM items WHERE collected_at >= ?1 GROUP BY field ORDER BY n DESC').bind(since).all()]);
  const groups = new Map(); results.forEach(r => { if (!groups.has(r.batch)) groups.set(r.batch, []); groups.get(r.batch).push(r); });
  const nav = fields.map(f => `<a href="?h=${hours}&field=${encodeURIComponent(f.field)}"${f.field === field ? ' class="on"' : ''}>${esc(f.field)} ${f.n}</a>`).join(' ');
  const last = batches[0];
  let body = '';
  for (const [b, rows] of groups) {
    body += `<h2>${esc(kst(b + ':00Z'))} 회차 <small>${rows.length}건</small></h2><table>` +
      rows.map(r => `<tr><td class=t>${esc(kst(r.published_at) || '—')}</td><td class=f>${esc(r.field)}</td><td class="g g${esc(r.tier)}">${esc(r.tier)}</td><td><a href="${esc(r.link)}" rel="noopener" target="_blank">${esc(r.title)}</a></td><td class=s>${esc(r.source)}</td></tr>`).join('') + '</table>';
  }
  const html = `<!doctype html><html lang="ko"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>데일리드롭 피드</title>
<style>body{font:14px/1.5 -apple-system,"Apple SD Gothic Neo","Malgun Gothic",sans-serif;margin:0;padding:16px;max-width:1100px;margin-inline:auto;color:#111;background:#fff}
h1{font-size:18px;margin:0 0 4px}h2{font-size:14px;margin:22px 0 6px;border-bottom:2px solid #111;padding-bottom:3px}h2 small{color:#777;font-weight:400}
.meta{color:#666;font-size:12.5px}.nav a{display:inline-block;margin:2px 6px 2px 0;color:#333;text-decoration:none;border:1px solid #ccc;padding:1px 7px;border-radius:3px;font-size:12.5px}.nav a.on{background:#111;color:#fff;border-color:#111}
table{width:100%;border-collapse:collapse}td{padding:4px 6px;border-bottom:1px solid #eee;vertical-align:top}td.t{white-space:nowrap;color:#777;font-variant-numeric:tabular-nums;width:72px}td.f{white-space:nowrap;color:#555;width:70px}td.s{color:#777;white-space:nowrap;font-size:12.5px}
td.g{width:18px;text-align:center;font-weight:700;font-size:12px}.gA{color:#0a6}.gB{color:#06c}.gC{color:#c80}.gD{color:#c33}a{color:#114}
@media(max-width:640px){td.s,td.f{display:none}}</style>
<h1>데일리드롭 피드 <span class=meta>· 10분마다 자동 수집 · 최근 ${hours}시간 ${results.length}건</span></h1>
<div class=meta>마지막 수집 ${last ? esc(kst(last.started_at)) + ` KST · 소스 ${last.n_sources}개 · 신규 ${last.n_new}건` : '아직 없음'} · <a href="/hourly/latest.json">1시간 취합본 JSON</a> · <a href="/items.json">원본 JSON</a> · 창: ${[3, 6, 12, 24].map(h => `<a href="?h=${h}${field ? '&field=' + encodeURIComponent(field) : ''}">${h}h</a>`).join(' ')}</div>
<div class=nav><a href="?h=${hours}"${field ? '' : ' class="on"'}>전체</a> ${nav}</div>
<div class=meta>등급 A 공식·1차자료 / B 주요 매체 / C 분석·블로그 / D 커뮤니티·SNS(팩트체크 필수). 제목·링크만 싣고 본문은 옮기지 않습니다.</div>
${body || '<p>아직 수집된 항목이 없습니다.</p>'}
</html>`;
  return new Response(html, { headers: { 'content-type': 'text/html; charset=utf-8' } });
}

export default {
  async fetch(req, env) {
    const url = new URL(req.url);
    if (req.method === 'OPTIONS') return new Response(null, { headers: { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*' } });
    if (url.pathname === '/ingest' && req.method === 'POST') {
      if (!env.INGEST_KEY || req.headers.get('authorization') !== 'Bearer ' + env.INGEST_KEY) return json({ error: 'unauthorized' }, 401);
      const p = await req.json(); const now = new Date().toISOString(); const items = (p.items || []).slice(0, 3000);
      let n_new = 0;
      const stmt = env.DB.prepare('INSERT OR IGNORE INTO items (id,title,link,source,field,tier,published_at,collected_at,batch,summary) VALUES (?1,?2,?3,?4,?5,?6,?7,?8,?9,?10)');
      for (let i = 0; i < items.length; i += 100) {
        const res = await env.DB.batch(items.slice(i, i + 100).map(it => stmt.bind(it.id, it.title, it.link, it.source, it.field || '기타', it.tier || 'C', it.published_at || null, now, p.batch, it.summary || null)));
        res.forEach(r => n_new += r.meta?.changes || 0);
      }
      await env.DB.prepare('INSERT OR REPLACE INTO batches (batch,started_at,n_fetched,n_new,n_sources,errors) VALUES (?1,?2,?3,?4,?5,?6)').bind(p.batch, p.started_at || now, p.n_fetched || items.length, n_new, p.n_sources || 0, JSON.stringify(p.errors || []).slice(0, 4000)).run();
      return json({ ok: true, batch: p.batch, received: items.length, new: n_new });
    }
    if (url.pathname === '/items.json') {
      const since = url.searchParams.get('since') || new Date(Date.now() - 6 * 3600_000).toISOString();
      const { results } = await env.DB.prepare('SELECT * FROM items WHERE collected_at >= ?1 ORDER BY collected_at DESC LIMIT 2000').bind(since).all();
      return json({ since, n: results.length, items: results });
    }
    if (url.pathname === '/batches.json') { const { results } = await env.DB.prepare('SELECT * FROM batches ORDER BY batch DESC LIMIT 144').all(); return json(results); }
    let m = url.pathname.match(/^\/hourly\/(latest|\d{4}-\d{2}-\d{2}T\d{2})\.json$/);
    if (m) {
      const hour = m[1] === 'latest' ? hourKey(Date.now() - 3600_000) : m[1];
      const row = await env.DB.prepare('SELECT digest FROM hourly WHERE hour = ?1').bind(hour).first();
      if (row && m[1] !== 'latest') return json(JSON.parse(row.digest));
      const d = await buildHourly(env, hour); // latest는 매번 새로 계산(수집이 늦게 들어와도 반영)
      return json(d);
    }
    if (url.pathname === '/hourly' || url.pathname === '/hourly/') { const { results } = await env.DB.prepare('SELECT hour, built_at, n_items FROM hourly ORDER BY hour DESC LIMIT 72').all(); return json(results); }
    if (url.pathname === '/') return page(env, url);
    return json({ error: 'not found', routes: ['/', '/items.json?since=ISO', '/hourly/latest.json', '/hourly/YYYY-MM-DDTHH.json', '/hourly', '/batches.json', 'POST /ingest'] }, 404);
  },
  async scheduled(ev, env, ctx) { ctx.waitUntil(buildHourly(env, hourKey(ev.scheduledTime - 3600_000))); },
};
