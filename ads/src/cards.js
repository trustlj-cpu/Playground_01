const {chromium}=require('playwright');const fs=require('fs');
const C=JSON.parse(fs.readFileSync(__dirname+'/copy.json'));
const BR='/home/user/Playground_01/site/brand/';
const URLTXT='dailydropnewspaper.com';
function html(l,w,h,kind){const c=C[l];const u=Math.min(w,h);
 const logo=`<img src="file://${BR}logo-ink.svg" style="width:${u*(kind==='cap'?0.3:0.62)}px">`;
 let inner='';
 if(kind==='intro')inner=`${logo}<div class="s" style="font-size:${u*0.034}px">${c.subS}</div>`;
 if(kind==='cap1')inner=`<div class="rule"></div><h1>${c.cap1}</h1><div class="rule"></div>`;
 if(kind==='cap2')inner=`<div class="rule"></div><h1>${c.cap2}</h1><div class="rule"></div>`;
 if(kind==='end')inner=`${logo}<div class="u" style="font-size:${u*0.058}px">${URLTXT}</div><span class="cta" style="font-size:${u*0.04}px;padding:${u*0.02}px ${u*0.045}px">${c.end} →</span>`;
 return `<!doctype html><html lang="${c.lang}"><head><meta charset="utf-8"><link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Noto+Serif+KR:wght@600;900&family=Noto+Serif+JP:wght@600;900&family=Noto+Serif:wght@600;900&display=swap"><style>
*{margin:0;box-sizing:border-box}body{width:${w}px;height:${h}px;background:#ece4d8 url(file://${BR}paper-grain.png) 0 0/320px 320px;color:#121212;font-family:"${c.font}",Georgia,serif;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:${u*0.05}px;text-align:center}
h1{font-weight:900;font-size:${u*(w<h?0.085:0.075)}px;line-height:1.3;letter-spacing:-.01em;word-break:keep-all}.rule{width:${u*0.5}px;border-top:${Math.max(3,u*0.004)}px solid #121212;border-bottom:${Math.max(1,u*0.0015)}px solid #121212;padding-top:3px}
.s{color:#363636;font-weight:600}.u{font-weight:900;letter-spacing:.01em}.cta{background:#121212;color:#ece4d8;font-weight:900}
</style></head><body>${inner}<div style="position:absolute;width:${u*0.012}px;height:${u*0.012}px;background:#8d2f22;border-radius:50%;bottom:${u*0.05}px;right:${u*0.05}px;${kind==='cap1'||kind==='cap2'?'':'display:none'}"></div></body></html>`}
(async()=>{const b=await chromium.launch();
for(const l of Object.keys(C))for(const [o,w,h] of [['v',1080,1920],['h',1920,1080]])for(const k of ['intro','cap1','cap2','end']){
 const ctx=await b.newContext({viewport:{width:w,height:h}});const pg=await ctx.newPage();
 const f=__dirname+'/_c.html';fs.writeFileSync(f,html(l,w,h,k));
 await pg.goto('file://'+f);await pg.evaluate(()=>document.fonts.ready);await pg.waitForTimeout(500);
 await pg.screenshot({path:`${__dirname}/card_${l}_${o}_${k}.png`});await ctx.close();}
fs.unlinkSync(__dirname+'/_c.html');await b.close()})();
