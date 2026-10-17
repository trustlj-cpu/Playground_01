import { clusterItems } from '/home/user/Playground_01/feed/worker/src/cluster.js';
import fs from 'fs';
const tag = process.argv[2];
for (const f of ['items.json','items_0110.json','items_03.json','items_04.json','items_05.json','items_06.json','items_07.json','items_08.json','items_09.json','items_11.json','items_13.json','items_14.json','items_15.json','items_20.json','items_21.json','items_1009h15.json','items_1009h16.json']) {
  const it = JSON.parse(fs.readFileSync(f,'utf8')); const cl = clusterItems(it);
  fs.writeFileSync(`${f}.${tag}.txt`, cl.filter(c=>c.n_items>1).map(c=>c.items.map(i=>(i.link||i.title).slice(-50)+' '+i.title.slice(0,50)).sort().join(' || ')).sort().join('\n'));
  console.log(tag, f, it.length, cl.length);
}
