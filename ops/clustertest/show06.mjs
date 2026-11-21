import { clusterItems, tokenList } from '/home/user/Playground_01/feed/worker/src/cluster.js';
import fs from 'fs';
const items = JSON.parse(fs.readFileSync(process.argv[2]||'items_06.json','utf8'));
const cl = clusterItems(items);
console.log('items', items.length, 'clusters', cl.length);
const pat = /probabilit|orrelation|mplied vol|순매수도|한국무역협회|KITA/i;
for (const c of cl) if (c.n_items>1 && c.items.some(i=>pat.test(i.title))) { console.log(`\n[${c.n_items}] ${c.field}`); c.items.forEach(i=>console.log('   -', i.title.slice(0,110), ' => ', tokenList(i.title).join(','))); }
