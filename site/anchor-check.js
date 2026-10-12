// 앵커 원고 검사기: site/editions/anchor/<날짜>.json 이 그 판 글(site/editions/<날짜>.html)에 있는 사실만 쓰는지, 방송 원고 규칙을 지키는지.
// 사용: node site/anchor-check.js 2026-10-13 [2026-10-12 …]   → 위반이 있으면 종료 코드 1
// ① 숫자: 원고의 모든 숫자열이 판 글에 그대로 있어야 한다. 말로 쓴 숫자(쉰 차례·다섯 개·두 발…)는 값으로 바꿔 판 글의 숫자와 맞춘다.
// ② 고유명사: 사람(직함 앞 이름)·기관·매체·영문 약어(말로 쓴 것 포함)가 판 글에 있어야 한다. 판 글에 없는 낱말은 모두 목록으로 낸다(사람이 훑어봄).
// ③ 규칙(괄괄이 2287): 한 문장 60자 이하, 괄호·기호·영문 없음, 격식체 「~니다.」, 「~죠/~거든요」·물음 없음, 같은 말끝 세 번 연속 없음,
//    한 문장 숫자 하나(날짜·시각·기간 묶음은 하나로 셈), 넘어가는 말은 판 안에서 겹치지 않음, 나에게는/두 시선/데일리드롭의 생각 코너 없음.
const fs = require('fs'), path = require('path');
const ROOT = __dirname;
const plain = x => String(x || '').replace(/<script\b[^>]*>([\s\S]*?)<\/script>/gi, ' $1 ').replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/\\u[0-9a-f]{4}/gi, m => String.fromCharCode(parseInt(m.slice(2), 16))).replace(/\s+/g, ' ');
const sentences = t => String(t || '').replace(/\s+/g, ' ').trim().split(/(?<=[.?!])\s+(?=\S)/).filter(Boolean);
// 말로 쓴 숫자 → 값
const NAT = { 한: 1, 두: 2, 세: 3, 네: 4, 다섯: 5, 여섯: 6, 일곱: 7, 여덟: 8, 아홉: 9, 열: 10, 스무: 20, 스물: 20, 서른: 30, 마흔: 40, 쉰: 50, 예순: 60, 일흔: 70, 여든: 80, 아흔: 90 };
const NATRE = /(?<![가-힣])((?:열|스물|스무|서른|마흔|쉰|예순|일흔|여든|아흔)?(?:한|두|세|네|다섯|여섯|일곱|여덟|아홉)?)\s?(차례|개|발|가지|명|시|번째|곳|대)(?![가-힣])/g;
const natVal = w => { let v = 0, r = w; for (const t of ['스물', '스무', '서른', '마흔', '쉰', '예순', '일흔', '여든', '아흔', '열']) if (r.startsWith(t)) { v += NAT[t]; r = r.slice(t.length); break; } if (r) { if (!(r in NAT)) return null; v += NAT[r]; } return v || null; };
// 말로 풀어 쓴 기호·약어·숫자 ↔ 판 글 표기(원고에 왼쪽이 나오면 판 글에 오른쪽 중 하나가 있어야 함)
const SPOKEN = [
  ['에스앤피', ['S&P']], ['에스유브이', ['SUV']], ['에이아이', ['AI']], ['에스케이', ['SK']], ['엔피알', ['NPR']], ['디엔', ['DN']],
  ['퍼센트', ['%']], ['킬로미터', ['㎞', 'km']], ['데시리터당', ['㎗']], ['마이크로그램', ['㎍']], ['십이삼', ['12·3']], ['1천만', ['1000만']],
  ['원 달러', ['원/달러']], ['나흘', ['나흘', '4일']], ['이틀', ['이틀']], ['아흐레', ['9일']],
];
const PART = /(이라는|이라며|이라고|라는|라며|라고|에서는|에서도|에서|에게|께서|으로|로는|로|은|는|이|가|을|를|의|에|와|과|도|까지|만|이며|이고|이었습니다|였습니다|입니다|쪽|당국)$/;
const TITLE = /^(대통령|장관|의원|의원실|총재|위원장|청장|회장|대표|교수|씨|직무대행|국무위원장)/;
const ORG = /(일보|뉴스|경제|신문|통신|방송|부|청|처|원|위원회|은행|그룹|전자|당|성|군|과학원|수비대|대학|대|기구|회의|연합|해협|공항|증시)$/;
const COMMON = new Set('정부 국회 경찰 야당 노조 노동부 외교부 회사 당국 정치 사법 시장 국제 민생 산업 금융 보안 중동 증시 사회 유럽 경제 노동 인권 자동차 북한 한국 미국 일본 중국 이란 사우디 서울 소식 데일리드롭 조간'.split(' '));
function check(date) {
  const out = { date, errors: [], warns: [], novel: [], spoken: [], sentences: 0 };
  const af = path.join(ROOT, 'editions', 'anchor', date + '.json'), ef = path.join(ROOT, 'editions', date + '.html');
  const A = JSON.parse(fs.readFileSync(af, 'utf8')); const ED = plain(fs.readFileSync(ef, 'utf8')); const EDn = ED.replace(/[\s,]/g, '');
  const has = x => ED.includes(x) || EDn.includes(String(x).replace(/[\s,]/g, ''));
  const err = (m) => out.errors.push(m), warn = m => out.warns.push(m);
  if (A.date !== date) err(`date field ${A.date} ≠ ${date}`);
  // 판 1면 기사 id
  const html = fs.readFileSync(ef, 'utf8'); const ids = [...html.matchAll(/class="[^"]*\bstory\b[^"]*"[^>]*data-id="([\w-]+)"/g)].map(m => m[1]);
  for (const s of A.stories) if (!ids.includes(s.id)) err(`story id ${s.id} not on the front page`);
  for (const id of ids) if (!A.stories.some(s => s.id === id)) warn(`front-page story ${id} has no anchor part`);
  const all = []; // {where, text}
  sentences(A.opening).forEach(t => all.push({ where: 'opening', text: t }));
  const trans = [];
  A.stories.forEach((s, k) => { if (s.transition) { trans.push(s.transition); sentences(s.transition).forEach(t => all.push({ where: s.id + '/transition', text: t })); }
    if (k > 0 && !s.transition) warn(`${s.id}: no transition`);
    const n = (s.lines || []).length; if (n < 3 || n > 10) err(`${s.id}: ${n} sentences (short item 3–4, main story lead 1–2 + body 4–8)`);
    (s.lines || []).forEach((t, j) => { const ss = sentences(t); if (ss.length !== 1) err(`${s.id}#${j}: line is not exactly one sentence`); all.push({ where: `${s.id}#${j + 1}`, text: t, story: s.id }); }); });
  sentences(A.closing).forEach(t => all.push({ where: 'closing', text: t }));
  if (new Set(trans).size !== trans.length) err('transition repeated within the edition');
  out.sentences = all.length;
  let prevEnd = [];
  for (const { where, text } of all) {
    const t = text.trim();
    if (t.length > 60) err(`${where}: ${t.length} chars > 60 「${t}」`); else if (t.length > 50) warn(`${where}: ${t.length} chars (target ~40)`);
    if (/[()[\]「」『』‘’“”"'<>]/.test(t)) err(`${where}: bracket/quote mark 「${t}」`);
    if (/[%㎞㎍㎗~·&/+=#@*]/.test(t)) err(`${where}: symbol not written as spoken 「${t}」`);
    if (/[A-Za-z]/.test(t)) err(`${where}: Latin letters (acronyms must be written as spoken) 「${t}」`);
    if (/\?/.test(t)) err(`${where}: question mark`);
    if (!/(니다|니까)\.$/.test(t)) err(`${where}: not a formal 습니다 ending 「${t}」`);
    if (/(죠|거든요|잖아요|네요|군요)[.!]?$|[가-힣](?<!니)다\.$/.test(t)) err(`${where}: 반말/구어 ending`);
    if (/나에게는|이렇게 보는 쪽|저렇게 보는 쪽|데일리드롭의 생각/.test(t)) err(`${where}: opinion corner included`);
    const end = t.replace(/\.$/, '').split(' ').pop().slice(-4); prevEnd.push(end); if (prevEnd.length > 3) prevEnd.shift();
    if (prevEnd.length === 3 && prevEnd.every(e => e === prevEnd[0])) err(`${where}: same ending 「${end}」 three times in a row`);
    // 숫자 하나: 날짜(월 일)·시각(시 분)·기간(년 개월)·「1억 7천만」 같은 한 값은 하나로 센다
    const grp = t.replace(/에스앤피 500/g, '에스앤피').replace(/\d+월 \d+일/g, 'D').replace(/(아홉|\d+) ?시 \d+분/g, 'T').replace(/\d+년 \d+개월/g, 'P').replace(/\d+억 \d+천만/g, 'N').replace(/\d+[\d,.]*/g, 'N');
    const nn = (grp.match(/[NDTP]/g) || []).length; if (nn > 1) err(`${where}: ${nn} numbers in one sentence 「${t}」`);
    // ① 숫자열
    for (const m of t.matchAll(/\d[\d,.]*\d|\d/g)) { if (!has(m[0])) err(`${where}: number ${m[0]} not in the edition text`); }
    // 말로 쓴 숫자
    for (const m of t.matchAll(NATRE)) { if (!m[1]) continue; const v = natVal(m[1]); if (v == null) continue; const unit = m[2];
      const okv = has(m[1] + ' ' + unit) || has(m[1] + unit) || has(v + unit) || has(v + ' ' + unit) || (unit === '가지' && where === 'opening' && v === A.stories.length);
      out.spoken.push(`${where}: 「${m[0].trim()}」 = ${v}${unit} → ${okv ? (unit === '가지' && v === A.stories.length && !has(v + unit) ? 'story count (' + A.stories.length + ' stories in this anchor)' : 'in edition') : 'NOT FOUND'}`);
      if (!okv) err(`${where}: spoken number 「${m[0].trim()}」(${v}${unit}) not in the edition`); }
    for (const [say, eds] of SPOKEN) if (t.includes(say)) { const okv = eds.some(has); out.spoken.push(`${where}: 「${say}」 ↔ ${eds.join(' / ')} → ${okv ? 'in edition' : 'NOT FOUND'}`); if (!okv) err(`${where}: 「${say}」 has no counterpart ${eds.join('/')} in the edition`); }
    // ② 고유명사·낱말
    const ws = t.replace(/[.,]/g, ' ').split(/\s+/).filter(Boolean);
    ws.forEach((w, i) => {
      if (!/[가-힣]/.test(w)) return; let stem = w; for (let k = 0; k < 3; k++) { const s2 = stem.replace(PART, ''); if (s2 === stem || s2.length < 1) break; stem = s2; }
      const spokenHit = SPOKEN.some(([say]) => w.includes(say));
      const found = has(w) || has(stem) || spokenHit;
      const next = ws[i + 1] || ''; const isName = TITLE.test(next) && /^[가-힣]{2,4}$/.test(stem) && !/^(이|그|두|윤|임|신|최|안|홀|전)$/.test(stem);
      const isOrg = stem.length >= 3 && ORG.test(stem) && !COMMON.has(stem);
      if (!found) { if ((isName || isOrg)) err(`${where}: proper noun? 「${stem}」 not in the edition text`); else if (stem.length >= 2) out.novel.push(stem); }
    });
  }
  out.novel = [...new Set(out.novel)];
  return out;
}
module.exports = { check };
if (require.main === module) {
  let bad = 0;
  for (const d of process.argv.slice(2)) { const r = check(d); console.log(`\n=== ${d}: ${r.sentences} sentences · ${r.errors.length} errors · ${r.warns.length} warnings`);
    r.errors.forEach(e => console.log('  ERROR ' + e)); r.warns.forEach(e => console.log('  warn  ' + e)); console.log('  spoken-number / spelled-out mappings:'); r.spoken.forEach(e => console.log('    ' + e));
    console.log(`  words not found verbatim in the edition (${r.novel.length}; broadcast phrasing — reviewed by hand): ${r.novel.join(' ')}`); if (r.errors.length) bad++; }
  process.exit(bad ? 1 : 0);
}
