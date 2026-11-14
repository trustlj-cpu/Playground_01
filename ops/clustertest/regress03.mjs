import { clusterItems } from '/home/user/Playground_01/feed/worker/src/cluster.js';
const F='금융경제', I='국제';
const items=[
 ["FinancialJuice: China's gold reserves 77.47 mln fine troy oz at end-Sept vs 76.73 mln troy oz at end-Aug: central bank",'FJ',F],
 ["FinancialJuice: China gold holdings $323.52 billion at end-Sept vs $350.08 billion at end-Aug: central bank",'FJ',F],
 ["FinancialJuice: China’s fx reserves $3.400 trln at end-Sept vs $3.438 trln at end-Aug: central bank",'FJ',F],
 ["FinancialJuice: S. Korea central bank: sells 1-year monetary stabilisation bonds at 3.55% yield",'FJ',F],
 ["Hong Kong police investigate case of girl, 10, made to carry bags of beer",'SCMP',I],
 ["Hong Kong’s AI city brain must understand how people really speak",'SCMP',I],
].map(([title,source,field],i)=>({id:'c'+i,title,source,field,tier:'B'}));
const cl=clusterItems(items); const f=t=>cl.find(c=>c.items.some(i=>i.title===t)); const same=(a,b)=>f(items[a].title)===f(items[b].title);
const checks=[['Korea MSB separate from China gold',!same(3,0)&&!same(3,1)&&!same(3,2)],['China gold reserves/holdings together',same(0,1)],['Hong Kong beer vs AI separate',!same(4,5)]];
let fail=0; for(const [n,ok] of checks){console.log(ok?'PASS':'FAIL',n); if(!ok)fail++;} console.log('fail',fail); process.exit(fail?1:0);
