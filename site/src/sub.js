// 구독(비공개 테스트) API — sub=1 계정만. 나머지는 403. index.js 가 /api/sub/* 를 여기로 넘긴다.
//  GET  /api/sub/front?lang=ko        고른 나라(3~5곳)와 그 나라 최신 공개 호의 1면 머리기사(lead.json)
//  PUT  /api/sub/front {countries:[]}  나라 저장(3~5곳, 발행 중인 나라만, 고른 순서 유지)
//  GET  /api/sub/words                 용어 북마크(최신순) + 용어사전 뜻(_sub/gloss.json 글자 그대로) + 처음 나온 기사
//  GET  /api/sub/search?q&r=KR&days=7|30|all&page=0   공개된 호의 기사(a.json)에서 낱말 찾기, 최신순 20건씩
// 호 목록·a.json·lead.json 은 site(=index.js 핸들러)를 다시 거쳐 읽어 예약 발행 규칙(공개 전 호는 안 보임)을 그대로 따른다.
import { subUser, ensureSubCols, sameOrigin } from './account.js';

const json = (obj, status = 200) => new Response(JSON.stringify(obj), { status, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', 'x-robots-tag': 'noindex' } });
const PER = 20;
const plain = s => String(s || '').replace(/<[^>]+>/g, ' ').replace(/&(amp|lt|gt|quot|#39|nbsp);/g, (m, k) => ({ amp: '&', lt: '<', gt: '>', quot: '"', '#39': "'", nbsp: ' ' })[k]).replace(/\s+/g, ' ').trim();

async function getJSON(site, p) { try { const r = await site(p); return r.ok ? await r.json() : null; } catch (e) { return null; } }
async function liveList(site) { const l = await getJSON(site, '/live.json'); return Array.isArray(l) ? l : []; }
// 그 나라의 공개된 호 날짜(최신순). 예약 발행 전이면 editions.json 사본이 그 호를 빼고 준다.
async function datesOf(site, prefix) { const j = await getJSON(site, '/' + prefix + 'editions.json'); return j && Array.isArray(j.editions) ? j.editions.map(e => e.date).filter(d => /^\d{4}-\d\d-\d\d$/.test(d)).sort().reverse() : []; }
const todayIn = tz => { try { return new Intl.DateTimeFormat('en-CA', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date()); } catch (e) { return new Date().toISOString().slice(0, 10); } };
const langMatch = (v, l) => v[l] ? l : Object.keys(v).find(k => k.split('-')[0] === String(l).split('-')[0]) || null;

let GLOSS = null, GLOSS_AT = 0;
async function gloss(env, url) {
  if (GLOSS && Date.now() - GLOSS_AT < 300000) return GLOSS;
  try { const r = await env.ASSETS.fetch(new Request(url.origin + '/_sub/gloss.json')); GLOSS = r.ok ? await r.json() : {}; } catch (e) { GLOSS = GLOSS || {}; }
  GLOSS_AT = Date.now(); return GLOSS;
}

export async function handleSub(request, env, url, site) {
  const u = await subUser(env, request);
  if (!u) return json({ ok: false, error: 'forbidden' }, 403);
  const p = url.pathname, m = request.method;
  if (m !== 'GET' && !sameOrigin(request, url)) return json({ ok: false, error: 'forbidden' }, 403);
  if (p === '/api/sub/front') return front(request, env, url, site, u, m);
  if (p === '/api/sub/words' && m === 'GET') return words(env, url, u);
  if (p === '/api/sub/search' && m === 'GET') return search(url, site);
  return json({ ok: false, error: 'not_found' }, 404);
}

// ── A. 나만의 1면
async function front(request, env, url, site, u, m) {
  const live = await liveList(site), pre = Object.fromEntries(live.map(x => [x.code, x.prefix]));
  if (m === 'PUT' || m === 'POST') {
    let b = null; try { b = JSON.parse((await request.text()).slice(0, 2000)); } catch (e) { }
    const list = b && Array.isArray(b.countries) ? b.countries : null;
    if (!list || !list.every(c => typeof c === 'string' && pre[c] !== undefined)) return json({ ok: false, error: 'country' }, 400);
    const uniq = [...new Set(list)];
    if (uniq.length !== list.length || uniq.length < 3 || uniq.length > 5) return json({ ok: false, error: 'count', n: uniq.length }, 400);
    await ensureSubCols(env);
    await env.UDB.prepare('UPDATE users SET front = ? WHERE id = ?').bind(JSON.stringify(uniq), u.id).run();
    return json({ ok: true, countries: uniq });
  }
  if (m !== 'GET') return json({ ok: false, error: 'method' }, 405);
  let countries = []; try { countries = JSON.parse(u.front || '[]'); } catch (e) { }
  countries = Array.isArray(countries) ? countries.filter(c => pre[c] !== undefined).slice(0, 5) : [];
  const lang = (url.searchParams.get('lang') || 'ko').slice(0, 8);
  const items = await Promise.all(countries.map(async code => {
    const prefix = pre[code], dates = await datesOf(site, prefix);
    for (const date of dates.slice(0, 2)) {
      const L = await getJSON(site, '/' + prefix + date + '/lead.json'); if (!L || !L.v) continue;
      const k = langMatch(L.v, lang), own = L.own, v = L.v[k || own] || L.v[own]; if (!v) continue;
      const tr = !!k && k !== own;
      return { code, date, at: L.at, tz: L.tz, lang: k || own, t: v.t, d: v.d, id: v.id, url: '/' + prefix + date + '/' + (tr ? k + '/' : ''), pending: !k, yest: date < todayIn(L.tz) };
    }
    return { code, none: true };
  }));
  return json({ ok: true, countries, live: live.map(x => x.code), items });
}

// ── B. 내 단어장
async function words(env, url, u) {
  const G = await gloss(env, url);
  const { results } = await env.UDB.prepare("SELECT id, region, date, lang, ref, url, note, created_at FROM bookmarks WHERE user_id = ? AND kind = 'term' ORDER BY created_at DESC, id DESC LIMIT 2000").bind(u.id).all();
  const items = (results || []).map(x => {
    // 그 말을 담은 판의 용어사전 → 한국판 → 다른 판 순서로 찾는다
    const regs = [x.region, 'KR', ...Object.keys(G)].filter(Boolean); let g = null, r = null;
    for (const k of regs) { if (G[k] && G[k].t && G[k].t[x.ref]) { g = G[k].t[x.ref]; r = k; break; } }
    const first = g && g.a ? { t: g.a.t, url: '/' + G[r].p + g.date + '/a/' + g.a.id + '/', date: g.date } : g ? { t: '', url: '/' + G[r].p + g.date + '/', date: g.date } : null;
    return { id: x.id, term: x.ref, d: g ? g.d : '', f: g ? g.f : '', region: r || x.region || '', first, saved: x.created_at, note: g ? '' : (x.note || '') };
  });
  return json({ ok: true, n: items.length, items });
}

// ── C. 지난 호 검색
// 기사 본문(a.json 의 b)에서 머리글·출처 목록·판 표시·'1면에서 읽기' 단추를 빼고 문장만
const bodyText = b => plain(String(b || '').replace(/<div class="ak">[\s\S]*?<\/div>/, '').replace(/<h1[\s\S]*?<\/h1>/, '').replace(/<ul class="as">[\s\S]*?<\/ul>/, '').replace(/<p class="ae">[\s\S]*?<\/p>/, '').replace(/<p><a class="btn"[\s\S]*?<\/p>/, ''));
// 낱말이 든 문장 하나 → [앞, 낱말, 뒤] (페이지가 textContent 로 넣고 가운데만 굵게 — HTML을 만들지 않는다)
function snippet(text, q) {
  const lo = text.toLowerCase(), i = lo.indexOf(q.toLowerCase()); if (i < 0) return null;
  let s = Math.max(text.lastIndexOf('. ', i), text.lastIndexOf('。', i), text.lastIndexOf('? ', i), text.lastIndexOf('! ', i), text.lastIndexOf('다. ', i));
  s = s < 0 ? 0 : s + (text[s] === '。' ? 1 : 2); if (text.slice(s, i).length > 90) s = i - 80;
  const re = /[.。?!](\s|$)/g; re.lastIndex = i + q.length; const mm = re.exec(text); let e = mm ? mm.index + 1 : text.length; if (e - i > 160) e = i + q.length + 120;
  return [(s > 0 && text.slice(s, i).length >= 80 ? '…' : '') + text.slice(s, i).trimStart(), text.slice(i, i + q.length), text.slice(i + q.length, e) + (e < text.length && !/[.。?!]$/.test(text.slice(0, e)) ? '…' : '')];
}
async function search(url, site) {
  const q = (url.searchParams.get('q') || '').replace(/\s+/g, ' ').trim().slice(0, 60);
  const days = url.searchParams.get('days'), page = Math.max(0, Math.min(50, parseInt(url.searchParams.get('page') || '0', 10) || 0));
  const live = await liveList(site), code = (url.searchParams.get('r') || 'KR').toUpperCase(), L = live.find(x => x.code === code);
  if (!L) return json({ ok: false, error: 'country' }, 400);
  if (q.length < 1) return json({ ok: true, q, r: code, total: 0, items: [], more: false });
  let dates = await datesOf(site, L.prefix);
  if (days === '7' || days === '30') { const from = new Date(Date.now() - (+days) * 864e5).toISOString().slice(0, 10); dates = dates.filter(d => d >= from); }
  const hits = [];
  // 호마다 a.json 하나(8개씩 나란히). 최신 호부터, 같은 호 안에서는 1면 순서.
  for (let i = 0; i < dates.length && hits.length < (page + 1) * PER + 1; i += 8) {
    const got = await Promise.all(dates.slice(i, i + 8).map(d => getJSON(site, '/' + L.prefix + d + '/a.json').then(j => [d, j])));
    for (const [d, j] of got) {
      if (!j || !j.items) continue;
      for (const [id, it] of Object.entries(j.items)) {
        const title = plain(it.t).replace(/ · DailyDrop$/, ''), text = bodyText(it.b);
        const sn = snippet(text, q) || snippet(title, q); if (!sn) continue;
        hits.push({ date: d, r: code, id, t: title, url: it.u || '/' + L.prefix + d + '/a/' + id + '/', s: sn });
      }
    }
  }
  const items = hits.slice(page * PER, page * PER + PER);
  return json({ ok: true, q, r: code, page, items, more: hits.length > (page + 1) * PER });
}
