import { clusterItems } from '/home/user/Playground_01/feed/worker/src/cluster.js';
const K='한국뉴스', T='테크', I='국제';
const items=[
 ['9월 서울 아파트 경매 낙찰가율 94.7%…1년 7개월 만에 최저','A',K],['서울 아파트 가격 상승률 상위 10년…3위 盧, 1·2위는?','B',K],
 ['Self-Propagating Misalignment in LLM Agents, and Why Auditing or Disabling Memory Is Not Enough','arxiv',T],['Auditing Pairwise Equivalence Judgments: Self-Critique Effects and Diversity Measurement in Multi-Agent Hypothesis','arxiv',T],['SkillScriptBench: Benchmarking Self-Evolution of Executable Agent Skill Packages Beyond Markdown','arxiv',T],['Beyond the Parameter Monolith: Executable Knowledge Modules','arxiv',T],
 ['Language Model Activations Inhabit Privileged Error-Correcting Basins','arxiv',T],['Towards Safer Autonomous Driving in an Open World: A Dual-Process Approach','arxiv',T],['Retrieval-Augmented Large Language Model Decision-Making for Autonomous Driving Guided by Chinese Philosophical','arxiv',T],
 ['Indian shares open lower ahead of RBI rate decision - Reuters','R',I],['Gold edges lower with focus on Fed minutes, rate path clues - Reuters','R',I],
 ['Exploration-Preserving Policy Optimization','arxiv',T],['LatentQuant: Preserving the Policy-Facing Latent Contract under NVFP4 VAE Quantization','arxiv',T],
 ['【手機比較】Oppo Find X10 E 與 Oppo Find X9 Ultra (中國版)：規格表、效能、攝影功能 - Techritual','GN',I],['【手機比較】Oppo Find X10 Pro Max 與 Oppo Find X9s：規格表、效能、攝影功能 - Techritual','GN',I],
 // 양성
 ['SK에너지·현대오일뱅크 44조원대 유류 담합 혐의…공정위 심의 착수','A',K],['공정위, SK에너지·현대오일뱅크 유가 담합 제재 절차 착수 - 연합뉴스TV','B',K],
 ['[속보] 누리호 비행 종료…위성 15기 모두 분리','A',K],['[속보]5차 누리호 비행 종료…위성 15기 모두 정상 투입','B',K],
 ['Messi signs off in tears after one last Argentina master class - Reuters','R',I],['Lionel Messi bids a tearful farewell to Argentina after 3-0 win over Benin - The Guardian','G',I],
].map(([title,source,field],i)=>({id:'d'+i,title,source,field,tier:'B'}));
const cl=clusterItems(items); const f=t=>cl.find(c=>c.items.some(i=>i.title===t)); const same=(a,b)=>f(items[a].title)===f(items[b].title);
const arx=items.filter(i=>i.source==='arxiv'); const arxSolo=arx.every(i=>f(i.title).n_items===1);
const checks=[['arXiv items all singletons',arxSolo],['① 서울 아파트 경매 vs 상승률 separate',!same(0,1)],['④ India/RBI vs Gold/Fed separate',!same(9,10)],['⑥ Oppo comparisons separate',!same(13,14)],
 ['+ SK에너지 담합 together',same(15,16)],['+ 누리호 종료 together',same(17,18)],['+ Messi together',same(19,20)]];
let fail=0; for(const [n,ok] of checks){console.log(ok?'PASS':'FAIL',n); if(!ok)fail++;} console.log('fail',fail); process.exit(fail?1:0);
