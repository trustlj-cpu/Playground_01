import { clusterItems } from '/home/user/Playground_01/feed/worker/src/cluster.js';
import fs from 'fs';
const cl = clusterItems(JSON.parse(fs.readFileSync('items_14.json','utf8')));
const find = s => cl.find(c => c.items.some(i => i.title.includes(s)));
let fail = 0;
const sep = (a, b, name) => { const ok = find(a) !== find(b); console.log((ok?'PASS':'FAIL') + ' ' + name + ' separate'); if (!ok) fail++; };
sep('crude oil production rose', 'crude oil imports from Nigeria', 'EIA 생산/수입');
console.log('clusters', cl.length, 'fail', fail);
