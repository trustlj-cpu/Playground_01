const {chromium}=require('playwright');const fs=require('fs');
const C=JSON.parse(fs.readFileSync(__dirname+'/copy.json'));
const SIZES=[[1200,628],[1200,1200],[960,1200],[300,250],[728,90],[320,50]];
const BR='/home/user/Playground_01/site/brand/';
const CAP=__dirname+'/';
function html(l,w,h){const c=C[l];
 const logo=`<img class="logo" src="file://${BR}logo-ink.svg">`;
 const shot=`<div class="shot"></div>`;
 let body='';
 const kind=(w===728&&h===90)?'leader':(w===320&&h===50)?'mini':(w===300&&h===250)?'rect':(w>=h*0.79&&w<=h*1.01&&h>=1200)?'tall':'wide';
 if(kind==='wide')body=`<div class="l">${logo}<h1>${c.head}</h1><p>${c.sub}</p><span class="cta">${c.cta}</span></div>${shot}`;
 if(kind==='tall')body=`<div class="t">${logo}<h1>${c.head}</h1><p>${c.sub}</p><span class="cta">${c.cta}</span></div>${shot}`;
 if(kind==='rect')body=`<div class="l">${logo}<h1>${c.headS}</h1><span class="cta">${c.ctaS}</span></div>${shot}`;
 if(kind==='leader')body=`${logo}<h1>${c.headS}</h1><span class="cta">${c.cta}</span>`;
 if(kind==='mini')body=`${logo}<h1>${c.headS}</h1><span class="cta">${c.ctaS}</span>`;
 const u=Math.min(w,h);
 return `<!doctype html><html lang="${c.lang}"><head><meta charset="utf-8"><link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Noto+Serif+KR:wght@600;900&family=Noto+Serif+JP:wght@600;900&family=Noto+Serif:wght@600;900&display=swap">
<style>*{box-sizing:border-box;margin:0}html,body{width:${w}px;height:${h}px;overflow:hidden}
body{background:#ece4d8;color:#121212;font-family:"${c.font}",Georgia,serif;position:relative;border:${kind==='mini'||kind==='leader'?1:2}px solid #121212;}
.logo{display:block}h1{font-weight:900;line-height:1.22;letter-spacing:-.01em}
p{color:#363636;font-weight:600}.cta{display:inline-block;background:#121212;color:#ece4d8;font-weight:900;white-space:nowrap}
.cta:after{content:" →"}
.shot{position:absolute;background:url(file://${CAP}cap_m_${l}.png) top center/100% auto no-repeat;box-shadow:0 0 0 1px #121212,6px 8px 0 rgba(18,18,18,.18);background-color:#ece4d8}
${kind==='wide'?`.l{position:absolute;left:64px;top:0;bottom:0;width:640px;display:flex;flex-direction:column;justify-content:center;gap:26px}.logo{width:330px}h1{font-size:58px}p{font-size:26px}.cta{font-size:28px;padding:16px 30px;align-self:flex-start;margin-top:6px}.shot{right:70px;top:52px;width:360px;height:${h-52}px;background-size:360px auto}`:''}
${kind==='tall'?`.t{position:absolute;left:0;right:0;top:0;padding:${u*0.06}px ${u*0.07}px 0;display:flex;flex-direction:column;gap:${u*0.022}px}.logo{width:${u*0.36}px}h1{font-size:${u*0.062}px}p{font-size:${u*0.03}px}.cta{font-size:${u*0.034}px;padding:${u*0.016}px ${u*0.034}px;align-self:flex-start}.shot{left:${u*0.07}px;right:${u*0.07}px;top:${u*0.6}px;bottom:0;background-size:100% auto}`:''}
${kind==='rect'?`.l{position:absolute;left:14px;top:0;bottom:0;width:168px;display:flex;flex-direction:column;justify-content:center;gap:12px}.logo{width:120px}h1{font-size:17px;line-height:1.3;word-break:keep-all}.cta{font-size:14px;padding:8px 12px;align-self:flex-start;white-space:normal}.shot{right:10px;top:16px;width:98px;height:${h-16}px;background-size:98px auto}`:''}
${kind==='leader'?`body{display:flex;align-items:center;gap:22px;padding:0 18px}.logo{width:148px;flex:none}h1{font-size:25px;flex:1;white-space:nowrap}.cta{font-size:20px;padding:12px 22px}`:''}
${kind==='mini'?`body{display:flex;align-items:center;gap:8px;padding:0 8px}.logo{width:72px;flex:none}h1{font-size:13px;flex:1;line-height:1.15}.cta{font-size:12px;padding:7px 9px}`:''}
</style></head><body>${body}</body></html>`}
(async()=>{const b=await chromium.launch();
for(const l of Object.keys(C))for(const [w,h] of SIZES){
 const ctx=await b.newContext({viewport:{width:w,height:h},deviceScaleFactor:1});const pg=await ctx.newPage();
 const f=`${CAP}_b_${l}_${w}x${h}.html`;fs.writeFileSync(f,html(l,w,h));
 await pg.goto('file://'+f);await pg.evaluate(()=>document.fonts.ready);await pg.waitForTimeout(600);
 await pg.screenshot({path:`/home/user/Playground_01/ads/banners/dailydrop_${l}_${w}x${h}.png`});await ctx.close();fs.unlinkSync(f);}
await b.close()})();
