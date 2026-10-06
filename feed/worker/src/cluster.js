// 같은 사건 묶기. 보수적: 대표(lead) 토큰과 비교(연쇄 병합 방지), 일반어 제외, 라틴 토큰은 정확 일치만.
const STOP = new Set(`the a an and or of to in on for with by from at as is are was be this that it its vs via amid after before over under into about says said say new will may could would should has have had not no up down out more most less than then here how first why what when where who which while also just like back make made get got one two three day days time news live update updates report reports watch video photos opinion analysis exclusive breaking today tonight week year years month top best deals deal prime big your their our his her they them been were into onto off per vs amid among between against during within without around every some any all each other another same still even much many few own man men woman women city case cases open opens death dies dead died join joins wins win won hit hits record high highs low lows rises rise falls fall gains gain drops drop climbs surge surges slips slip stall stalls move moves live update updates latest market markets stocks stock shares price prices week weekly daily month monthly review preview since until after before says said say told tells telling told according minister secretary official officials spending cuts cut pass passes passed ready prepared senate race races election elections vote votes voters poll polls campaign candidate candidates january february march april may june july august september october november december monday tuesday wednesday thursday friday saturday sunday
및 등 의 을 를 이 가 은 는 에 에서 로 으로 와 과 도 만 더 또 대한 위한 관련 통해 대해 속보 단독 종합 영상 포토 사진 기자 뉴스 오늘 내일 어제 발표 확인 가능 전망 이번 지난 올해 내년 작년 최고 최대 최초 역대 처음 다시 계속 위해 때문 이후 이전 전체 관계자 입장 밝혔다 밝혀 나타났다 것으로 한다 했다 있다 없다 된다 됐다 한국 미국 정부 국내 세계 글로벌 시장 기업 업계 사람 사용 서비스 공개 출시 진행 예정 추진 검토 논란 우려 기대 효과 결과 이유 방법 상황 문제`.split(/\s+/));
const SYN = { '한은': '한국은행', '연준': 'fed', 'fomc': 'fed', '코스피': 'kospi', '美': '미국', '中': '중국', '日': '일본', 'trump': '트럼프', 'bitcoin': '비트코인', 'btc': '비트코인', 'samsung': '삼성전자', '삼성': '삼성전자', 'nvidia': '엔비디아', '소비자물가': '물가', '물가상승률': '물가', '트럼프': '트럼프' };
const PREFIX = /^(financialjuice|odd lots|breaking|exclusive|watch|live|update|opinion|analysis|explainer|factbox|속보|단독|종합|포토|영상|르포|사설|칼럼|기고|인터뷰)\s*[:：|·-]\s*/i;
export const normTitle = t => String(t || '').replace(/\[.*?\]|\(.*?\)|【.*?】/g, ' ').trim().replace(PREFIX, '').replace(/\s+[-|–—]\s+[^-|–—]{2,30}$/, '').replace(/\s+/g, ' ').trim().toLowerCase();
export function tokens(t) {
  const out = new Set();
  const raw = normTitle(t).match(/[가-힣]{2,}|[A-Za-z][A-Za-z0-9'&.-]{3,}|\d{3,}/g) || [];
  const parts = []; for (const w of raw) { parts.push(w); if (w.includes('-')) for (const p of w.split('-')) if (p.length >= 4) parts.push(p); }
  for (const w1 of parts) {
    const w0 = w1.replace(/^[.'&-]+|[.'&-]+$/g, '').replace(/'s$/, ''); if (w0.length < 3) continue;
    const w = SYN[w0] || w0;
    if (STOP.has(w)) continue;
    if (/^\d+$/.test(w) && w.length === 4 && +w >= 1990 && +w <= 2100) continue; // 연도
    out.add(w);
  }
  return out;
}
const isKo = w => /^[가-힣]+$/.test(w);
// 두 토큰 집합의 '의미 있는' 겹침 수. 한국어는 3자 이상 부분 일치 허용(소비자물가⊃물가 X: 2자 금지), 라틴은 정확 일치만.
export function shared(a, b) {
  let n = 0, strong = 0;
  for (const x of a) if (b.has(x)) { n++; if (x.length >= 4 || /\d/.test(x)) strong++; }
  for (const x of a) if (!b.has(x) && isKo(x) && x.length >= 3) for (const y of b) if (!a.has(y) && isKo(y) && y.length >= 3 && (x.includes(y) || y.includes(x))) { n++; break; }
  return { n, strong };
}
const same = (A, B) => { const s = shared(A.toks, B.toks); return A.field === B.field ? ((s.n >= 2 && s.strong >= 2) || s.n >= 3) : (s.n >= 3 && s.strong >= 3); };
export function clusterItems(items) {
  const rows = items.map(it => ({ it, toks: tokens(it.title), field: it.field }));
  // 토큰 많은(정보량 큰) 제목이 대표가 되도록 정렬
  const key = r => String(r.it.id || '') + '\u0000' + String(r.it.title || '');
  const order = rows.map((_, i) => i).sort((i, j) => rows[j].toks.size - rows[i].toks.size || (key(rows[i]) < key(rows[j]) ? -1 : key(rows[i]) > key(rows[j]) ? 1 : 0));
  const clusters = []; // {lead, members}
  for (const i of order) {
    const r = rows[i];
    // 예측시장·시세 항목은 계약/질문·기간이 달라도 이름이 겹치므로 묶지 않는다(각자 단독)
    const solo = r.field === '예측시장' || /^\[(예측|코인)\]/.test(String(r.it.title));
    if (solo || r.toks.size < 2) { clusters.push({ lead: { ...r, toks: new Set() }, members: [r] }); continue; }
    let best = null, bestN = 0;
    for (const c of clusters) { if (c.lead.toks.size < 2 || !same(c.lead, r)) continue; const s = shared(c.lead.toks, r.toks).n; if (s > bestN) { best = c; bestN = s; } }
    if (best) best.members.push(r); else clusters.push({ lead: r, members: [r] });
  }
  const out = [];
  for (const c of clusters) {
    const g = c.members.map(m => m.it);
    const srcs = [...new Set(g.map(x => x.source))]; const ab = new Set(g.filter(x => 'AB'.includes(x.tier)).map(x => x.source));
    const status = ab.size >= 2 ? '복수 수집 경로(A/B ' + ab.size + '곳) — 독립성·사실 확인 필요' : ab.size === 1 ? '단일 수집 경로 — 원자료 확인 필요' : g.some(x => x.tier === 'C') ? '분석/블로그 — 1차 자료 대조 필요' : '미확인(커뮤니티·트렌드) — 팩트체크 필수';
    const kw = new Map(); c.members.forEach(m => m.toks.forEach(t => kw.set(t, (kw.get(t) || 0) + 1)));
    g.sort((a, b) => String(a.tier).localeCompare(String(b.tier)) || String(b.published_at || '').localeCompare(String(a.published_at || '')) || String(a.id || a.title).localeCompare(String(b.id || b.title)));
    const fieldCount = new Map(); g.forEach(x => fieldCount.set(x.field, (fieldCount.get(x.field) || 0) + 1));
    out.push({ topic: c.lead.it.title, keywords: [...kw.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6).map(e => e[0]), field: [...fieldCount.entries()].sort((a, b) => b[1] - a[1])[0][0], n_items: g.length, n_sources: srcs.length, sources: srcs, tier_best: g.map(x => x.tier).sort()[0], status, items: g.map(x => ({ title: x.title, source: x.source, link: x.link, tier: x.tier, published_at: x.published_at })) });
  }
  out.sort((a, b) => b.n_sources - a.n_sources || b.n_items - a.n_items || (a.topic < b.topic ? -1 : a.topic > b.topic ? 1 : 0));
  return out;
}
