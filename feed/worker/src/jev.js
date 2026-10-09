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
