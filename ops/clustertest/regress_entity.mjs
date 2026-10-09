import { clusterItems } from '/home/user/Playground_01/feed/worker/src/cluster.js';
const K='한국뉴스', I='국제';
const items=[
 ['김재섭 국정감사 증인 출석','A',K],['김재섭 지역구 축제 방문','B',K],
 ['한국은행 기준금리 동결','A',K],['한국은행 신입직원 채용','B',K],
 ['삼성전자 반도체 공장 착공','A',K],['삼성전자 개인정보 유출','B',K],
 ['SpaceX launches orbital rocket','A',I],['SpaceX settles employment lawsuit','B',I],
 // 양성: 같은 사건
 ['보스턴다이내믹스, 새 CEO에 아마존 출신 로히트 프라사드 영입','A',K],['보스턴다이내믹스, AI 전문가 프라사드 CEO 영입','B',K],
 ['골드만삭스 "삼성전자, 8일 변동성 확대…매도 요인 겹쳐"','A',K],['골드만삭스 “삼성전자 8일 요동친다”…매도 요인 3개나 겹쳤다는데','B',K],
].map(([title,source,field],i)=>({id:'e'+i,title,source,field,tier:'B'}));
const cl=clusterItems(items); const f=t=>cl.find(c=>c.items.some(i=>i.title===t)); const same=(a,b)=>f(items[a].title)===f(items[b].title);
const checks=[['김재섭 different events separate',!same(0,1)],['한국은행 different events separate',!same(2,3)],['삼성전자 different events separate',!same(4,5)],['SpaceX different events separate',!same(6,7)],['보스턴다이내믹스 same event together',same(8,9)],['골드만삭스/삼성 same event together',same(10,11)]];
let fail=0; for(const [n,ok] of checks){console.log(ok?'PASS':'FAIL',n); if(!ok)fail++;} console.log('fail',fail); process.exit(fail?1:0);
