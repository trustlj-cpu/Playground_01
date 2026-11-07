import { clusterItems } from '/home/user/Playground_01/feed/worker/src/cluster.js';
import fs from 'fs';
const items = JSON.parse(fs.readFileSync('items_09.json','utf8'));
const cl = clusterItems(items);
const find = s => cl.find(c => c.items.some(i => i.title.includes(s)));
let fail = 0;
const sep = (a, b, name) => { const ok = find(a) !== find(b); console.log((ok?'PASS':'FAIL') + ' ' + name + ' separate'); if (!ok) fail++; };
sep('홈플러스 협력업체 정책자금', '공공배달앱 예산', '① 이소영 장관 두 정책');
console.log('clusters', cl.length, 'fail', fail);
