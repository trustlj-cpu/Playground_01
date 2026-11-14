// 예약 발행 준비(배포 워크플로가 build.js 다음에 실행): editions.json에서 publish_at이 아직 안 된 호를 찾아
// 그 호까지 넣은 전체 빌드를 따로 만들고, 그 나라 1면과 그 호 페이지(번역 포함)만 public/_sched/<key>/ 아래에 복사한다.
// public/schedule.json = [{key, at, prefix, date}] — 사이트 Worker(src/index.js)가 at이 지나면 해당 경로를 _sched 사본으로 내보낸다.
// 그래서 원고를 미리 등록해 두면, 세션이 멈춰 있어도 각국 현지 06:00에 공개된다.
// 석간(slot:"pm", 현지 18:00)도 같다: key = <나라>-<date>-pm, schedule.json 의 date = 호 키(<date>-pm) → Worker 가 /<prefix><date>-pm/ 를 _sched 사본으로 내보낸다.
const fs = require('fs'), path = require('path'), { execFileSync } = require('child_process');
const SITE = __dirname, PUB = path.join(SITE, 'public');
const eds = JSON.parse(fs.readFileSync(path.join(SITE, 'editions.json'), 'utf8'));
const pre = Object.fromEntries(JSON.parse(fs.readFileSync(path.join(SITE, 'countries.json'), 'utf8')).map(c => [c.code, c.prefix]));
const hid = new Set(JSON.parse(fs.readFileSync(path.join(SITE, 'countries.json'), 'utf8')).filter(c => c.hidden).map(c => c.code)); // 비공개 나라는 예약 발행도 안 함
const now = Date.now();
const sched = eds.filter(e => e.publish_at && Date.parse(e.publish_at) > now && !hid.has(e.region || 'KR'));
const dk = e => e.date + (e.slot === 'pm' ? '-pm' : ''), ord = e => e.date + (e.slot === 'pm' ? '~' : ''); // 호 키 · 정렬 키(같은 날 조간 < 석간)
const out = [];
if (sched.length) {
  const ALL = path.join(require('os').tmpdir(), 'dd_all');
  execFileSync(process.execPath, [path.join(SITE, 'build.js'), path.join(SITE, 'editions.json'), ALL], { env: { ...process.env, DD_NOW: String(8.64e15) }, stdio: 'inherit' });
  for (const e of sched) {
    const r = e.region || 'KR', prefix = pre[r] || '', key = `${r}-${dk(e)}`, dst = path.join(PUB, '_sched', key);
    // 같은 나라에 석간이 예약돼 있어 이 호보다 늦은 예약 호가 또 있으면, '모두 넣은 빌드'의 1면은 이 호가 아니다 → 이 호의 공개 시각 기준으로 따로 빌드한다(석간이 없으면 기존 그대로)
    let SRC = ALL;
    if (sched.some(x => x !== e && (x.region || 'KR') === r && ord(x) > ord(e)) && sched.some(x => (x.region || 'KR') === r && x.slot === 'pm')) {
      SRC = path.join(require('os').tmpdir(), 'dd_at_' + key);
      execFileSync(process.execPath, [path.join(SITE, 'build.js'), path.join(SITE, 'editions.json'), SRC], { env: { ...process.env, DD_NOW: String(Date.parse(e.publish_at)) }, stdio: 'inherit' });
    }
    fs.mkdirSync(path.join(dst, prefix), { recursive: true });
    fs.copyFileSync(path.join(SRC, prefix, 'index.html'), path.join(dst, prefix, 'index.html'));
    fs.cpSync(path.join(SRC, prefix, dk(e)), path.join(dst, prefix, dk(e)), { recursive: true });
    // 앱·외부가 읽는 그 나라 호 목록(editions.json)도 공개 시각에 맞춰 바뀌게: 이 호까지만 남긴 사본
    try { const ej = JSON.parse(fs.readFileSync(path.join(SRC, prefix, 'editions.json'), 'utf8')); if (Array.isArray(ej.editions)) { ej.editions = ej.editions.filter(x => !x.date || x.date + (x.slot === 'pm' ? '~' : '') <= ord(e)); if (ej.latest && ej.latest > e.date) ej.latest = e.date; if (e.slot === 'pm') ej.latest_slot = 'pm'; else delete ej.latest_slot; } fs.writeFileSync(path.join(dst, prefix, 'editions.json'), JSON.stringify(ej)); } catch (err) { }
    // 앱 API(/app/v1): 이 호의 JSON + 공개 시각 기준 index·glossary 사본(그 시각까지 공개된 호만). Worker가 같은 key로 내보낸다.
    try {
      const app = path.join(ALL, 'app', 'v1'), adst = path.join(dst, 'app', 'v1'), at = Date.parse(e.publish_at); fs.mkdirSync(path.join(adst, r), { recursive: true });
      for (const f of fs.readdirSync(path.join(app, r))) if (f.startsWith(dk(e) + '.')) fs.copyFileSync(path.join(app, r, f), path.join(adst, r, f));
      require('./appapi.js').writeAggregate(app, adst, (R, d, sl) => eds.some(x => (x.region || 'KR') === R && x.date === d && (x.slot || '') === (sl || '') && (!x.publish_at || Date.parse(x.publish_at) <= at)));
    } catch (err) { console.warn(`app api sched ${key} skipped:`, err.message); }
    out.push({ key, at: Date.parse(e.publish_at), prefix, date: dk(e) });
  }
}
fs.writeFileSync(path.join(PUB, 'schedule.json'), JSON.stringify(out));
console.log('scheduled', out.map(x => `${x.key}@${new Date(x.at).toISOString()}`).join(' ') || 'none');
