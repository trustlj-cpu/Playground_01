import { clusterItems } from '/home/user/Playground_01/feed/worker/src/cluster.js';
const mk=(t,lang,i)=>({id:'y'+i+Math.random(),title:t,lang,source:'s'+i,tier:'B',field:'국제',region:'XX',published_at:'2026-10-11T09:10:00Z',link:'https://e/'+i});
const apart=[['tr',["ABD'deki silahlı saldırıda 8 ölü: Aynı aileden 7 kişi hayatını kaybetti","Son Dakika... Manisa'da feci kaza: TIR ile yolcu otobüsü çarpıştı, çok sayıda ölü ve yaralı var!"]],
['vi',['Khởi tố đối tượng Thắng "Ật" về tội Gây rối trật tự công cộng','Sinh viên thi phát triển UAV phục vụ an ninh công cộng, cứu hộ lũ lụt']],
['en',['2026 Singapore Grand Prix attracts 301,294 fans, second-highest attendance on record','Bezzecchi wins as Martin retakes championship lead at Indonesian Grand Prix']],
['pl',['Niedzielny koszmar. 20-latek w Audi zmiótł rowerzystki z drogi','18-latek wypadł autem z drogi i uderzył w drzewo. Nie przeżył']],
['zh-TW',['竹北博愛路優鼎科技大火 濃煙竄天釀空污消防出動15車','快訊／苗栗縣苑裡鎮垃圾掩埋場大火！警消搶救中 國三153公里處濃煙瀰漫小心駕駛']]];
const together=[['tr',["Son Dakika... Manisa'da feci kaza: TIR ile yolcu otobüsü çarpıştı, çok sayıda ölü ve yaralı var!","Son dakika: Manisa'da tır ile yolcu otobüsü çarpıştı: 11 kişi hayatını kaybetti"]],
['zh-TW',['快訊／竹北台元科技廠周遭大火！濃黑煙狂竄出 消防急搶救','快訊／新竹台元科技園區工廠火警！大片濃煙狂竄 消防搶救中']],
['vi',['Khởi tố đối tượng Thắng "Ật" về tội Gây rối trật tự công cộng',"Công an Ninh Bình khởi tố Thắng 'Ật'"]]];
let f=0;for(const[l,t]of apart){if(clusterItems(t.map((x,i)=>mk(x,l,i))).some(c=>c.n_items>1)){f++;console.log('FAIL merged',t[0].slice(0,30))}}
for(const[l,t]of together){if(!clusterItems(t.map((x,i)=>mk(x,l,i))).some(c=>c.n_items>1)){f++;console.log('FAIL split',t[0].slice(0,30))}}
console.log('fail',f);
