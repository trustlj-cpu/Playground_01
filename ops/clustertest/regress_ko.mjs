import { clusterItems } from '/home/user/Playground_01/feed/worker/src/cluster.js';
const K='한국뉴스';
const items=[
 ['국민의힘 김재섭 “정치 경찰 표적 수사 응하지 않겠다…체포동의안 보내라”','경향',K],['김재섭 "국감 첫날 부르다니" vs 경찰 "날짜 직접 정해"','한경',K],
 ['"산부인과 CCTV 유출" 환복 장면까지…경찰 수사','SBS',K],['옷 갈아입는 모습까지 털렸다…산부인과 CCTV 불법사이트서 유통 - 중앙일보','GN',K],
 ['“HD현대일렉트릭, 영업익 시장추정치 밑돌 것”...목표가↓','매경',K],['“HD현대일렉트릭, 환율 부담에 3분기 컨센서스 하회”…하나증권, 목표가↓','매경',K],
 ['“코스맥스, K뷰티 수출 훈풍 제대로 탔다”…하나증권, 목표가↑','매경',K],['“K뷰티 비수기, 이 회사는 예외”…코스맥스 목표주가 30만→38만원 [오늘 나온 보고서]','매경',K],
 ['"잔금 앞두고 8억이나 깎아달라니"…부동산 시장에 무슨 일이','한경',K],['"줄 서서 사더니 14.5% 파격 할인?"…금 매장에 무슨 일이 [차이나 워치]','한경',K],
 ['혁오, 7일 새 싱글 ‘지는 날’ 발매…2개월 만의 신곡','동아',K],['투어스, 11월 2일 싱글 2집 ‘투 어스’ 발매…6개월 만의 컴백','동아',K],
 ['트럼프 “LA·샌디에이고 파괴하게 놔둬라”···이란전 ‘작은 대가’ 발언 파장','경향',K],['트럼프 “한국에 관세 낮추려면 대가 지불해야 한다고 말해”','경향',K],
 ['한은 금리 인하 결정','연합',K],['한국은행 금리 인하 결정','한경',K],
 ['트럼프, 알래스카 LNG 한국 참여 기정사실화','A',K],['트럼프 "중간선거 깜짝 승리"','B',K],['트럼프 대통령 볼티모어 연설 종료','C',K],
].map(([title,source,field],i)=>({id:'k'+i,title,source,field,tier:'B'}));
const cl=clusterItems(items); const f=t=>cl.find(c=>c.items.some(i=>i.title===t)); const same=(a,b)=>f(items[a].title)===f(items[b].title);
const checks=[['김재섭 2건 together',same(0,1)],['산부인과 2건 together',same(2,3)],['김재섭 vs 산부인과 separate',!same(0,2)],
 ['HD현대일렉트릭 2건 together',same(4,5)],['코스맥스 2건 together',same(6,7)],['HD vs 코스맥스 separate',!same(4,6)],
 ['잔금 vs 금매장 separate',!same(8,9)],['혁오 vs 투어스 separate',!same(10,11)],['트럼프 LA vs 관세 separate',!same(12,13)],['한은/한국은행 together',same(14,15)]];
let fail=0; for(const [n,ok] of checks){console.log(ok?'PASS':'FAIL',n); if(!ok)fail++;} console.log('fail',fail); process.exit(fail?1:0);
