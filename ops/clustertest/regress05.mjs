import { clusterItems } from '/home/user/Playground_01/feed/worker/src/cluster.js';
import fs from 'fs';
const items = JSON.parse(fs.readFileSync('items_05.json','utf8'));
const cl = clusterItems(items);
const find = s => cl.find(c => c.items.some(i => i.title.includes(s)));
let fail = 0;
const sep = (a, b, name) => { const ok = find(a) !== find(b); console.log((ok?'PASS':'FAIL') + ' ' + name + ' separate'); if (!ok) fail++; };
sep('Takaichi: will consider reviewing', 'Takaichi: We will lead international debate', '① 다카이치 금리/AI 거버넌스');
sep('King Khalid International Airport', "Abha airport", '② 후티 리야드/아브하 공항');
console.log('clusters', cl.length, 'fail', fail);
{ const cl2 = clusterItems(items); const f2 = s => cl2.find(c => c.items.some(i => i.title.includes(s)));
  const chk = (ok, name) => { console.log((ok?'PASS':'FAIL') + ' ' + name); if (!ok) process.exitCode = 1; };
  chk(f2('Abha airport') !== f2('Khamis Mushait'), '③ 후티 아브하 공항/카미스 무샤이트 기지 separate');
  chk(f2('Abha airport') !== f2('King Khalid'), '③ 아브하/리야드 still separate');
  chk(f2('우주청 "초소형군집위성 6호 남극세종기지') === f2('우주청장 "초소형군집위성 6호 남극세종기지'), '④ 우주청/우주청장 6호 교신 together'); }
