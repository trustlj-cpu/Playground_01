import { clusterItems } from '/home/user/Playground_01/feed/worker/src/cluster.js';
import fs from 'fs';
const items = JSON.parse(fs.readFileSync('items.json','utf8'));
const cl = clusterItems(items);
console.log('items', items.length, 'clusters', cl.length, 'sum', cl.reduce((a,c)=>a+c.n_items,0));
for (const c of cl.slice(0,12)) { console.log(`\n[${c.n_sources}src/${c.n_items}] ${c.field} :: ${c.topic}`); c.items.slice(0,6).forEach(i=>console.log('   -', i.source, '|', i.title.slice(0,70))); }
