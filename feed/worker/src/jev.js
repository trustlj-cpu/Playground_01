// Jev(TypeSafe 판단 전용 모델) 그림자 운영(사장님 10/9): 매시 다이제스트가 만들어진 뒤, 나라별 상위 묶음마다
// '1면 가치(0~3)'와 '속보 여부(확률)'를 Jev에게 묻고 D1 jev 표에 저장한다. 발행 선택에는 아직 쓰지 않고, 편집 데스크 선택과 비교만 한다.
// TYPESAFE_API_KEY(Cloudflare 비밀값)가 없으면 아무 것도 하지 않는다. API: POST https://api.typesafe.ai/v1/systemone
const URL_ = 'https://api.typesafe.ai/v1/systemone';
const LEVELS = ['skip — not important to readers of this edition', 'brief — a one-line mention', 'inside story — worth its own short article', 'front-page lead — the most important story for this edition today']; // 0~3
const hkey = t => { let h = 2166136261; for (let i = 0; i < t.length; i++) { h ^= t.charCodeAt(i); h = Math.imul(h, 16777619); } return (h >>> 0).toString(36); };
const PER_REGION = 6;

async function ask(env, state) {
  const body = { model: 'jev-latest', state, questions: {
    front: { type: 'score', instructions: `Rate how prominently the ${state.edition} edition of a daily one-page newspaper should run this story today.`, criteria: LEVELS },
    breaking: { type: 'noul', instructions: 'Is this a breaking news event (sudden, just happened, needs immediate attention)?', criteria: { true: 'breaking news', false: 'not breaking' } },
  } };
  const r = await fetch(URL_, { method: 'POST', headers: { authorization: 'Bearer ' + env.TYPESAFE_API_KEY, 'content-type': 'application/json' }, body: JSON.stringify(body), signal: AbortSignal.timeout(8000) });
  if (!r.ok) throw new Error('jev ' + r.status + ' ' + (await r.text()).slice(0, 200));
  const j = await r.json(); const a = j.answers || {};
  return { front: a.front && a.front.score, conf: a.front && a.front.confidence, brk: a.breaking && a.breaking.noul };
}

export async function jevShadow(env, hour, digest) {
  if (!env.TYPESAFE_API_KEY || !digest || !Array.isArray(digest.clusters)) return { skipped: true };
  await env.DB.prepare('CREATE TABLE IF NOT EXISTS jev (hour TEXT, region TEXT, ckey TEXT, title TEXT, n INTEGER, front REAL, conf REAL, brk REAL, err TEXT, at TEXT, PRIMARY KEY (hour, region, ckey))').run();
  const regions = new Set(); for (const c of digest.clusters) for (const it of c.items || []) if (it.region && it.region !== 'GLB') regions.add(it.region);
  let done = 0, failed = 0;
  for (const region of regions) {
    const cand = digest.clusters.filter(c => (c.items || []).some(it => it.region === region || it.region === 'GLB'))
      .sort((a, b) => (b.n_sources || b.n_items || 0) - (a.n_sources || a.n_items || 0)).slice(0, PER_REGION);
    await Promise.all(cand.map(async c => {
      const items = (c.items || []).slice(0, 6), title = String((items[0] || {}).title || '').slice(0, 200), ckey = hkey(title.toLowerCase());
      const state = { edition: region, headlines: items.map(it => String(it.title || '').slice(0, 200)), outlets: [...new Set(items.map(it => it.source))].slice(0, 8), n_articles: c.n_items || items.length, n_outlets: c.n_sources || null, field: (items[0] || {}).field || null };
      let res = {}, err = null; try { res = await ask(env, state); done++; } catch (e) { err = String(e && e.message || e).slice(0, 300); failed++; }
      await env.DB.prepare('INSERT OR REPLACE INTO jev (hour, region, ckey, title, n, front, conf, brk, err, at) VALUES (?1,?2,?3,?4,?5,?6,?7,?8,?9,?10)').bind(hour, region, ckey, title, c.n_items || 0, res.front ?? null, res.conf ?? null, res.brk ?? null, err, new Date().toISOString()).run();
    }));
  }
  return { done, failed, regions: regions.size };
}

// Jev 용어 선별(사장님 10/10): 편집 에이전트가 판 원고의 후보 용어를 D1 jev_terms 에 넣으면(done 비어 있음),
// 매분 크론이 묶어서 Jev에게 '이 판 독자에게 설명이 필요한 말인가'를 묻고 p(필요 확률)를 채운다. 에이전트는 p로 용어사전 G를 고른다.
// 컨테이너에서 Worker로 직접 요청할 수 없어 D1을 우편함처럼 쓴다. 한 번에 최대 120개, Jev 호출 1회당 용어 10개.
const TERMS_PER_CALL = 10;
export async function jevTerms(env) {
  if (!env.TYPESAFE_API_KEY) return { skipped: true };
  await env.DB.prepare('CREATE TABLE IF NOT EXISTS jev_terms (id INTEGER PRIMARY KEY AUTOINCREMENT, edition TEXT, lang TEXT, term TEXT, context TEXT, p REAL, conf REAL, err TEXT, created TEXT, done TEXT)').run();
  const { results } = await env.DB.prepare('SELECT id, edition, lang, term, context, kind FROM jev_terms WHERE done IS NULL ORDER BY id LIMIT 120').all();
  if (!results || !results.length) return { done: 0 };
  const groups = new Map(); for (const r of results) { const k = r.edition + '|' + r.lang + '|' + (r.kind || 'term'); if (!groups.has(k)) groups.set(k, []); groups.get(k).push(r); }
  const chunks = []; for (const rows of groups.values()) for (let i = 0; i < rows.length; i += TERMS_PER_CALL) chunks.push(rows.slice(i, i + TERMS_PER_CALL));
  let done = 0, failed = 0; const now = new Date().toISOString();
  await Promise.all(chunks.map(async rows => {
    const { edition, lang } = rows[0];
    const infl = rows[0].kind === 'infl'; const questions = {}; rows.forEach((r, i) => { questions['t' + i] = infl ? { type: 'noul', instructions: `For the ${edition} edition of a daily newspaper (written in ${lang}): ${String(r.term).slice(0, 120)} said or posted: "${String(r.context || '').slice(0, 260)}". Is this a notable statement by an influential figure that readers of this edition would want to see in a short 'what influential people said' box (domestic figures of this country or globally influential figures)?`, criteria: { true: 'worth showing to these readers', false: 'not notable for these readers' } } : { type: 'noul', instructions: `In the ${edition} edition of a daily newspaper (written in ${lang}) the term "${String(r.term).slice(0, 80)}" appears${r.context ? ' in: "' + String(r.context).slice(0, 200) + '"' : ''}. Would a typical general reader of this edition need a short glossary explanation of this term to understand the story?`, criteria: { true: 'needs a glossary explanation', false: 'common knowledge for these readers' } }; });
    const state = infl ? { edition, language: lang, task: 'choose notable influencer statements for a newspaper box', speakers: rows.map(r => String(r.term).slice(0, 120)) } : { edition, language: lang, task: 'choose newspaper glossary terms', terms: rows.map(r => String(r.term).slice(0, 80)) };
    let a = null, err = null;
    try {
      const r = await fetch(URL_, { method: 'POST', headers: { authorization: 'Bearer ' + env.TYPESAFE_API_KEY, 'content-type': 'application/json' }, body: JSON.stringify({ model: 'jev-latest', state, questions }), signal: AbortSignal.timeout(20000) });
      if (!r.ok) throw new Error('jev ' + r.status + ' ' + (await r.text()).slice(0, 200));
      a = (await r.json()).answers || {};
    } catch (e) { err = String(e && e.message || e).slice(0, 300); }
    for (let i = 0; i < rows.length; i++) {
      const x = a && a['t' + i]; const p = x && typeof x.noul === 'number' ? x.noul : null;
      if (p === null) failed++; else done++;
      await env.DB.prepare('UPDATE jev_terms SET p = ?1, conf = ?2, err = ?3, done = ?4 WHERE id = ?5').bind(p, x && x.confidence != null ? x.confidence : null, p === null ? (err || 'no answer') : null, now, rows[i].id).run();
    }
  }));
  return { done, failed };
}
