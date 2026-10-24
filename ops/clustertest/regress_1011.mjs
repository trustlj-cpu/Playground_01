import { clusterItems } from '/home/user/Playground_01/feed/worker/src/cluster.js';
const mk=(t,lang,src,i)=>({id:'x'+i+Math.random(),title:t,lang,source:src+i,tier:'B',field:'국제',region:'XX',published_at:'2026-10-11T08:10:00Z',link:'https://e/'+i});
const groups=[
 ['tr',['Liverpool - Manchester City maçı ne zaman, saat kaçta, hangi kanalda? Şifresiz mi?','Hull City - Everton maçı ne zaman, saat kaçta, hangi kanalda? Şifresiz mi?','Cagliari - Juventus maçı ne zaman, saat kaçta, hangi kanalda? Şifresiz mi?']],
 ['es',['Mitre (SE) vs Colón en vivo por la fecha 33 de la Primera Nacional: hora, dónde ver y formaciones','Platense vs Argentinos en vivo por la fase de grupos de la Liga Profesional: hora, dónde ver y formaciones']],
 ['en',['Enugu police probe alleged shooting at NDC secretariat','President Ferdinand Marcos Jr. confirms that ICT Secretary Henry Aguda has resigned, cites the ongoing probe into the alleged ghost connectivity projects']],
 ['en',['Iran Executes Man for Killing Police Officer','BREAKING: Beaumont police investigating officer-involved shooting - KFDM']],
 [null,['Liga : le coach du Real Madrid José Mourinho boycotte la conférence de presse après le carton rouge de Vinicius','2. Liga: Kiel-Coach Walter auch gegen Hertha auf der Bank']],
];
let fail=0;for(const [l,ts] of groups){const it=ts.map((t,i)=>mk(t,l,'s',i));const m=clusterItems(it).filter(c=>c.n_items>1);if(m.length){fail++;console.log('FAIL merged:',ts[0].slice(0,40))}}
// must still merge
const keep=[['tr',['Suudi Arabistan\'da havalimanına saldırı: 12 ölü','Suudi Arabistan\'da Riyad Havalimanı\'na saldırı: 12 kişi öldü']],['en',['Vinicius sent off in Real Madrid win as Barcelona maintain 100% rate','Mourinho boycotts press conference after Vinicius red card in Real Madrid win']],['pl',['"Możliwy zamach na premiera Tuska". Służby po','Zamach na Tuska? Pilna narada służb']]];
for(const [l,ts] of keep){const it=ts.map((t,i)=>mk(t,l,'s',i));const m=clusterItems(it).filter(c=>c.n_items>1);if(!m.length){fail++;console.log('FAIL split:',ts[0].slice(0,40))}}
console.log('fail',fail);
