// 같은 사건 묶기. 보수적: 대표(lead) 토큰과 비교(연쇄 병합 방지), 일반어 제외, 라틴 토큰은 정확 일치만.
const STOP = new Set(`the a an and or of to in on for with by from at as is are was be this that it its vs via amid after before over under into about says said say new will may could would should has have had not no up down out more most less than then here how first why what when where who which while also just like back make made get got one two three day days immediate immediately confirmation confirmed confirms confirm claim claims claimed responsibility statement statements ballistic missile missiles drone drones rocket rockets shelling airstrike airstrikes time news live update updates report reports watch video photos opinion analysis exclusive breaking today tonight week year years month top best deals deal prime big your their our his her they them been were into onto off per vs amid among between against during within without around every some any all each other another same still even much many few own man men woman women city case cases open opens death dies dead died join joins wins win won hit hits record high highs low lows rises rise falls fall gains gain drops drop climbs surge surges slips slip stall stalls move moves live update updates latest market markets stocks stock shares price prices week weekly daily month monthly review preview since until after before says said say told tells telling told according minister secretary state department spokesman spokesperson spokeswoman official officials spending cuts cut pass passes passed ready prepared senate race races election elections vote votes voters poll polls campaign candidate candidates january february march april may june july august september october november december monday tuesday wednesday thursday friday saturday sunday attack attacks attacked strike strikes struck killed kills dead deaths wounded injured forces troops military army leader leaders president vice prime minister secretary chancellor governor senator warns warning warned threat threatens index indices indicator survey actual forecast previous consensus estimate estimates reading readings data central bank banks reserves holdings billion million trillion bln mln trln yield yields bonds bond rate rates lower higher ahead focus clues edges open opens opened find finds self multi agent agents llm llms model models language learning approach approaches towards based large small novel framework method methods benchmark benchmarking policy optimization preserving robust efficient scalable neural network networks deep training inference generative transformer transformers
및 등 의 을 를 이 가 은 는 에 에서 로 으로 와 과 도 만 더 또 대한 위한 관련 통해 대해 장관 차관 총리 대통령 청장 위원장 의원 대표 회장 사장 국장 지사 교수 감독 부총재보 부총재 총재 원장 시장 군수 구청장 장관은 장관이 대통령은 대통령이 고래 whale whales 속보 단독 종합 영상 포토 사진 기자 경찰 수사 조사 체포 소환 논란 파장 발언 대가 할인 파격 무슨 발매 싱글 신곡 컴백 앨범 음원 활동 목표가 목표주가 증권 증권사 보고서 컨센서스 실적 분기 특징주 장초반 강세 약세 상향 하향 상회 하회 추정치 기대감 하나증권 kb증권 nh투자증권 삼성증권 미래에셋 키움증권 신한투자증권 대신증권 한국투자증권 유안타증권 메리츠증권 매수 매도 주가 종목 시장 금리 영업익 매출 순이익 어닝 인상 인하 동결 전망 예상 가능성 우려 기대 영향 확대 축소 감소 증가 급등 급락 상승 하락 최고 최저 사상 역대 처음 첫 아파트 주택 부동산 집값 가격 경매 매매 전세 월세 거래 지역 서울시 수도권 두 세 네 하나 둘 셋 올해 내년 작년 지난해 이번주 다음주 오늘 내일 어제 현재 최근 뉴스 오늘 내일 어제 발표 확인 가능 전망 이번 지난 올해 내년 작년 최고 최대 최초 역대 처음 다시 계속 위해 때문 이후 이전 전체 관계자 입장 밝혔다 밝혀 나타났다 것으로 한다 했다 있다 없다 된다 됐다 한국 미국 정부 국내 세계 글로벌 시장 기업 업계 사람 사용 서비스 공개 출시 진행 예정 추진 검토 논란 우려 기대 효과 결과 이유 방법 상황 문제`.split(/\s+/));
const SYN = { '한은': '한국은행', '연준': 'fed', 'fomc': 'fed', '코스피': 'kospi', '美': '미국', '中': '중국', '日': '일본', 'trump': '트럼프', 'bitcoin': '비트코인', 'btc': '비트코인', 'samsung': '삼성전자', '삼성': '삼성전자', 'nvidia': '엔비디아', '소비자물가': '물가', '물가상승률': '물가', '트럼프': '트럼프' };
const PREFIX = /^(financialjuice|odd lots|breaking|exclusive|watch|live|update|opinion|analysis|explainer|factbox|속보|단독|종합|포토|영상|르포|사설|칼럼|기고|인터뷰)\s*[:：|·-]\s*/i;
const ACR_STOP = new Set('us uk eu un the and for its new top says said day big how why who may can has had are was one two ceo pm mr ms dr we he it in on at to of by'.split(' '));
const normCase = t => String(t || '').replace(/\[.*?\]|\(.*?\)|【.*?】/g, ' ').trim().replace(PREFIX, '').replace(/\s+[-|–—]\s+(?:(?!\s[-|–—]\s)[^|–—]){2,40}$/, '').replace(/\s+/g, ' ').trim();
export const normTitle = t => normCase(t).toLowerCase();
export function tokenList(t) { return [...tokens(t)]; } // 삽입 순서 = 제목 내 등장 순서
export function tokens(t) {
  const out = new Set();
  const raw = normTitle(t).match(/\d{1,4}-[A-Za-z]{2,}|[가-힣]{2,}|[A-Za-z][A-Za-z0-9'&.-]{3,}|\d{3,}/g) || [];
  const parts = []; for (const w of raw) { parts.push(w); if (w.includes('-')) for (const p of w.split('-')) if (p.length >= 4) parts.push(p); }
  // 2~3자 약어(BoE·SNB·Fed·ECB·FX)는 원문 대소문자에서만 식별 — 소문자화 전 제목에서 뽑아 약한 토큰으로 추가
  const acr = new Set((normCase(t).match(/(?<![A-Za-z0-9&.'가-힣-])[A-Z][A-Za-z]{1,2}(?![A-Za-z0-9&.'가-힣-])/g) || []).map(x => x.toLowerCase()).filter(x => !ACR_STOP.has(x)));
  for (const w1 of [...parts, ...acr]) {
    const w0 = w1.replace(/^[.'&-]+|[.'&-]+$/g, '').replace(/'s$/, ''); if (!w0 || (!/^[가-힣]+$/.test(w0) && w0.length < 4 && !acr.has(w0))) continue; // 한국어는 2자부터, 라틴은 4자부터(원문 약어 예외)
    const w = SYN[w0] || w0;
    if (STOP.has(w)) continue;
    if (/^\d+$/.test(w) && w.length === 4 && +w >= 1990 && +w <= 2100) continue; // 연도
    out.add(w);
  }
  return out;
}
const isKo = w => /^[가-힣]+$/.test(w);
const GEO = new Set('russia russian ukraine ukrainian china chinese taiwan japan japanese korea korean north south iran iranian israel israeli gaza palestinian europe european france french germany german britain british england spain spanish italy india indian brazil saudi arabia yemen houthi houthis syria iraq turkey turkish america american asian asia african africa sudan sudanese hong kong hongkong taipei shanghai singapore washington beijing moscow kyiv tokyo seoul london paris berlin 미국 중국 일본 북한 한국 러시아 우크라이나 이란 이스라엘 유럽 대만 인도 브라질 사우디 예멘 후티 중동 서울 워싱턴 베이징 모스크바 도쿄'.split(' '));
// 두 토큰 집합의 '의미 있는' 겹침 수. 한국어는 3자 이상 부분 일치 허용(소비자물가⊃물가 X: 2자 금지), 라틴은 정확 일치만.
// df: 이번 묶음 입력 전체에서 토큰이 등장한 제목 수. 희귀 토큰(≤3개 제목)이 두 제목 모두 앞 2토큰(주어 자리)에 있으면 하나만 겹쳐도 같은 사건 신호.
// 한 시간에 8개 이상 제목에 나오는 '뜨거운' 토큰(삼성전자·반도체·누리호·AI)끼리만 겹치면 같은 사건 근거로 부족 — 뜨겁지 않은 강한 토큰이 최소 1개는 있어야 함
const isHot = (x, df) => df && (df.get(x) || 0) >= 8;
const isRare = (x, df) => df && (df.get(x) || 0) <= 3 && !GEO.has(x) && (isKo(x) ? x.length >= 3 : (x.length >= 5 || /\d/.test(x)));
export function shared(a, b, df, leadA, leadB) {
  let n = 0, strong = 0, rare = 0, exact = 0, nonGeo = 0, strongCool = 0;
  for (const x of a) if (b.has(x)) { n++; if (!GEO.has(x)) nonGeo++; if (!GEO.has(x) && (isKo(x) || x.length >= 4 || /\d/.test(x))) exact++; if (!GEO.has(x) && (x.length >= 4 || /\d/.test(x) || (isKo(x) && x.length >= 3))) { strong++; if (!isHot(x, df)) strongCool++; } if (isRare(x, df) && leadA && leadB && leadA.has(x) && leadB.has(x)) rare++; }
  for (const x of a) if (!b.has(x) && isKo(x) && x.length >= 3) for (const y of b) if (!a.has(y) && isKo(y) && y.length >= 3 && (x.includes(y) || y.includes(x))) { n++; nonGeo++; break; }
  return { n, strong, rare, exact, nonGeo, strongCool }; // strongCool: 이번 입력에서 8개 미만 제목에 나오는 강한 토큰 수 // exact: 부분일치·지명·2~3자 약어 제외 정확 겹침, nonGeo: 지명 제외 겹침
}
// 같은 분야: 강한 토큰(지명 제외, 4자+/숫자/한국어) 2개, 또는 3개 겹침 중 강한 것 1개 이상. 다른 분야: 3개 이상 전부 강한 토큰.
const BROAD = new Set(['한국뉴스', '국제', '금융경제', '테크', '인플루언서', '트렌드', '사회', '문화', '정치', '경제']);
// 같은 좁은 분야: 강한 2개 또는 3개 겹침+강한 1개. 넓은 분야(종합 뉴스): 강한 2개 또는 4개 겹침+강한 1개. 다른 분야: 3개 전부 강한 토큰.
// 짧은 정형 제목(각 4토큰 이하: 데이터 표·지표 안내)은 한쪽에만 있는 토큰(한국어 부분일치 없음)이 하나라도 있으면 다른 항목 — BoE/SNB 금리확률, 30/60일 상관행렬, 코스닥×기관/거래소×외국인 표
const onlyIn = (a, b) => { let k = 0; for (const x of a) { if (b.has(x)) continue; let part = false; if (isKo(x) && x.length >= 3) for (const y of b) if (isKo(y) && y.length >= 3 && (x.includes(y) || y.includes(x))) { part = true; break; } if (!part) k++; } return k; };
const shortDistinct = (A, B) => A.toks.size <= 4 && B.toks.size <= 4 && (onlyIn(A.toks, B.toks) > 0 || onlyIn(B.toks, A.toks) > 0);
const same = (A, B, df) => { if (shortDistinct(A, B)) return false; const s = shared(A.toks, B.toks, df, A.lead, B.lead); if (A.field !== B.field) return s.n >= 3 && s.strong >= 3; const broad = BROAD.has(A.field); return (s.n >= 2 && s.strong >= 2 && s.strongCool >= 1) || (s.nonGeo >= (broad ? 4 : 3) && s.strong >= 1) || (s.rare >= 1 && s.exact >= 2); }; // 희귀 주어 규칙은 부분일치(총괄부회장에⊃총괄) 불인정 // 희귀 주어 + 다른 겹침 1개 이상(같은 인물의 다른 사건 분리)
export function clusterItems(items) {
  const rows = items.map(it => { const list = tokenList(it.title); return { it, toks: new Set(list), lead: new Set(list.slice(0, 2)), field: it.field }; });
  const df = new Map(); rows.forEach(r => r.toks.forEach(t => df.set(t, (df.get(t) || 0) + 1)));
  // 토큰 많은(정보량 큰) 제목이 대표가 되도록 정렬
  const key = r => String(r.it.id || '') + '\u0000' + String(r.it.title || '');
  const order = rows.map((_, i) => i).sort((i, j) => rows[j].toks.size - rows[i].toks.size || (key(rows[i]) < key(rows[j]) ? -1 : key(rows[i]) > key(rows[j]) ? 1 : 0));
  const clusters = []; // {lead, members}
  for (const i of order) {
    const r = rows[i];
    // 예측시장·시세 항목은 계약/질문·기간이 달라도 이름이 겹치므로 묶지 않는다(각자 단독)
    // 예측시장·시세·논문(arXiv)은 항목 하나가 곧 독립 단위 — 같은 주제라도 묶지 않는다
    const solo = r.field === '예측시장' || /^\[(예측|코인)\]/.test(String(r.it.title)) || /arxiv/i.test(String(r.it.source || '')) || /arxiv\.org/i.test(String(r.it.link || ''));
    if (solo || r.toks.size < 2) { clusters.push({ lead: { ...r, toks: new Set() }, members: [r] }); continue; }
    let best = null, bestN = 0;
    for (const c of clusters) { if (c.lead.toks.size < 2 || !same(c.lead, r, df)) continue; const s = shared(c.lead.toks, r.toks, df, c.lead.lead, r.lead).n; if (s > bestN) { best = c; bestN = s; } }
    // 대표와는 안 맞아도 구성원과 거의 같은 제목(지명 제외 정확 겹침 3개 이상, 같은 분야)이면 합류 — 우주청/우주청장 "6호 교신 확인" 같은 동일 발언의 다른 표기. 연쇄 병합 방지를 위해 기준을 높게 둠
    if (!best) for (const c of clusters) { if (c.lead.toks.size < 2) continue; for (const m of c.members) { if (m.field !== r.field || shortDistinct(m, r)) continue; const s = shared(m.toks, r.toks, df, m.lead, r.lead); if (s.exact >= 3 && s.strong >= 2 && s.n > bestN) { best = c; bestN = s.n; } } }
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
