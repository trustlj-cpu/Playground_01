// 예약 발행 준비(배포 워크플로가 build.js 다음에 실행): editions.json에서 publish_at이 아직 안 된 호를 찾아
// 그 호까지 넣은 전체 빌드를 따로 만들고, 그 나라 1면과 그 호 페이지(번역 포함)만 public/_sched/<key>/ 아래에 복사한다.
// public/schedule.json = [{key, at, prefix, date}] — 사이트 Worker(src/index.js)가 at이 지나면 해당 경로를 _sched 사본으로 내보낸다.
// 그래서 원고를 미리 등록해 두면, 세션이 멈춰 있어도 각국 현지 06:00에 공개된다.
const fs = require('fs'), path = require('path'), { execFileSync } = require('child_process');
const SITE = __dirname, PUB = path.join(SITE, 'public');
const eds = JSON.parse(fs.readFileSync(path.join(SITE, 'editions.json'), 'utf8'));
const pre = Object.fromEntries(JSON.parse(fs.readFileSync(path.join(SITE, 'countries.json'), 'utf8')).map(c => [c.code, c.prefix]));
const now = Date.now();
const sched = eds.filter(e => e.publish_at && Date.parse(e.publish_at) > now);
const out = [];
if (sched.length) {
  const ALL = path.join(require('os').tmpdir(), 'dd_all');
  execFileSync(process.execPath, [path.join(SITE, 'build.js'), path.join(SITE, 'editions.json'), ALL], { env: { ...process.env, DD_NOW: String(8.64e15) }, stdio: 'inherit' });
  for (const e of sched) {
    const r = e.region || 'KR', prefix = pre[r] || '', key = `${r}-${e.date}`, dst = path.join(PUB, '_sched', key);
    fs.mkdirSync(path.join(dst, prefix), { recursive: true });
    fs.copyFileSync(path.join(ALL, prefix, 'index.html'), path.join(dst, prefix, 'index.html'));
    fs.cpSync(path.join(ALL, prefix, e.date), path.join(dst, prefix, e.date), { recursive: true });
    // 앱·외부가 읽는 그 나라 호 목록(editions.json)도 공개 시각에 맞춰 바뀌게: 이 호까지만 남긴 사본
    try { const ej = JSON.parse(fs.readFileSync(path.join(ALL, prefix, 'editions.json'), 'utf8')); if (Array.isArray(ej.editions)) { ej.editions = ej.editions.filter(x => !x.date || x.date <= e.date); if (ej.latest && ej.latest > e.date) ej.latest = e.date; } fs.writeFileSync(path.join(dst, prefix, 'editions.json'), JSON.stringify(ej)); } catch (err) { }
    out.push({ key, at: Date.parse(e.publish_at), prefix, date: e.date });
  }
}
fs.writeFileSync(path.join(PUB, 'schedule.json'), JSON.stringify(out));
console.log('scheduled', out.map(x => `${x.key}@${new Date(x.at).toISOString()}`).join(' ') || 'none');
