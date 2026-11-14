import { clusterItems, normTitle } from '/home/user/Playground_01/feed/worker/src/cluster.js';
const F='금융경제', I='국제', K='한국뉴스', Y='인플루언서';
const items = [
 // ① 이란/트럼프 vs S&P 최고 종가 (분리돼야)
 ['FinancialJuice: Trump: Pretty soon you\'ll find out how we finish up Iran','FJ',F],
 ['FinancialJuice: Trump on Iran: We have to finish up; the question is how.','FJ',F],
 ['FinancialJuice: Trump on Iran: We still have to finish it off','FJ',F],
 ['FinancialJuice: Trump: Iran\'s drone-making capacity will soon be gone','FJ',F],
 ['FinancialJuice: US Treasury Secretary Bessent: Iran has not loaded a single barrel of crude onto a vessel since August 25th.','FJ',F],
 ['FinancialJuice: S&P 500 registers a record closing high for the first time since August 13th','FJ',F],
 // ② 프랑스 예산 vs RBA (분리)
 ['FinancialJuice: France\'s Finance Minister: Government ready to circumvent parliament to pass spending cuts - WSJ','FJ',F],
 ['FinancialJuice: French Finance Minister: Will circumvent parliament if budget negotiations stall - WSJ','FJ',F],
 ['FinancialJuice: Finance Minister: Prepared to exercise special constitutional powers to pass cuts - WSJ','FJ',F],
 ['FinancialJuice: RBA warns AI, other shares correcting could cut spending 2.4%','FJ',F],
 ['FinancialJuice: RBA warns AI stock correction could hit household spending','FJ',F],
 // ③ NC vs Maine 상원 (분리)
 ['GOP, Dems Pull Back Spending From North Carolina Senate Race','BTV',Y],
 ['$1,500 Heating Bills at Center of Maine Senate Race','BTV',Y],
 // 양성: 같은 사건은 묶여야
 ['Cornell brings in ex-Justice official Sally Yates to review school\'s handling of sex assault claims - AP News','AP',I],
 ['Cornell hires ex-Justice Dept official Yates to review rape claims response - Reuters','Reuters',I],
 ['Cornell names Sally Yates to review university\'s response to rape case','AJ',I],
 ['US death row inmate Christa Pike conscious after failed execution, lawyers say - BBC','GN',I],
 ['Christa Pike conscious and speaking after Tennessee failed execution','SCMP',I],
 ['Paramount completes its takeover of Warner Bros to become one Hollywood giant known as Skydance - AP News','AP',I],
 ['Paramount-Warner Bros. Discovery merger closes after nearly yearlong battle, paving the way for Skydance - Yahoo Finance','GN',I],
 ['Ronaldo accuses coach Jesus of broken promises but leaves Portugal return open - Reuters','Reuters',I],
 ['Ronaldo apologizes for Portugal walkout; says Jesus broke promise','AJ',I],
 // ④ 불가리아 상선 vs 젤렌스키 경고 (분리)
 ['Bulgaria\'s leader says drone attack hits 2 commercial vessels, and Ukraine\'s president blames Russia - AP News','AP',I],
 ['Zelenskiy: "There is updated intelligence indicating that Russia is preparing a massive attack on Ukraine"','reddit','트렌드'],
 // ⑤ 한국어 동일 사건 (묶임)
 ['한은 금리 인하 결정','연합','경제'],['한국은행 금리 인하 결정','한경','경제'],
].map(([title,source,field],i)=>({id:'r'+i,title,source,field,tier:'B'}));
const cl = clusterItems(items);
const find = t => cl.find(c=>c.items.some(i=>i.title===t));
const same = (a,b)=>find(a)===find(b);
const checks = [
 ['① S&P separate from Iran', !same(items[5].title, items[0].title)],
 ['① Bessent-Iran not merged with S&P', !same(items[4].title, items[5].title)],
 ['② RBA separate from France', !same(items[9].title, items[6].title)],
 ['② France items together', same(items[6].title, items[7].title)],
 ['③ NC vs Maine separate', !same(items[11].title, items[12].title)],
 ['+ Cornell 3 together', same(items[13].title, items[14].title) && same(items[13].title, items[15].title)],
 ['+ Christa Pike together', same(items[16].title, items[17].title)],
 ['+ Paramount together', same(items[18].title, items[19].title)],
 ['+ Ronaldo together', same(items[20].title, items[21].title)],
 ['④ Bulgaria vs Zelenskiy separate', !same(items[22].title, items[23].title)],
 ['⑤ 한은/한국은행 together', same(items[24].title, items[25].title)],
];
let fail=0; for (const [n,ok] of checks){ console.log(ok?'PASS':'FAIL', n); if(!ok) fail++; }
console.log('clusters', cl.length, 'fail', fail); process.exit(fail?1:0);
