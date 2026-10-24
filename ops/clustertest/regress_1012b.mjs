import { clusterItems } from '/home/user/Playground_01/feed/worker/src/cluster.js';
const T=['Au moins 139 migrants morts et 84 portés disparus au large de Djibouti','Turquie: au moins onze morts et 27 blessés dans un accident de bus','Drame au large de Djibouti: Au moins 139 migrants morts dans un naufrage'];
const it=T.map((t,i)=>({id:'x'+i,title:t,lang:'fr',source:'s'+i,field:'국제',tier:'B',region:'FR',published_at:'2026-10-11T16:00:00Z',link:'u'+i}));
const cl=clusterItems(it);const turk=cl.find(c=>c.items.some(i=>i.title.startsWith('Turquie')));const dj=cl.find(c=>c.items.some(i=>i.title.startsWith('Au moins 139')));
const ok=turk.n_items===1&&dj.items.some(i=>i.title.startsWith('Drame'));console.log(ok?'fail 0':'fail 1',cl.map(c=>c.n_items));
