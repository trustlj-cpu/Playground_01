import { clusterItems } from '/home/user/Playground_01/feed/worker/src/cluster.js';
import fs from 'fs';const it=JSON.parse(fs.readFileSync(process.argv[2],'utf8'));const cl=clusterItems(it);
const m=cl.filter(c=>c.n_items>1).sort((a,b)=>b.n_items-a.n_items);console.log('clusters',cl.length,'multi',m.length);
for(const c of m.slice(0,60))console.log(c.n_items+' | '+[...new Set(c.items.map(i=>i.title.slice(0,46)))].slice(0,4).join(' ‖ '));
