const {chromium}=require('playwright');const fs=require('fs');
const SITE='/home/user/Playground_01/site';
const pages={ko:'editions/2026-11-28.html',en:'editions/us/2026-11-27.pm.html',ja:'editions/jp/2026-11-28.pm.html'};
const CSS='main,.strip,.glos,footer{filter:blur(9px)!important}.tip,.ov{display:none!important}';
(async()=>{const b=await chromium.launch();
for(const [l,p] of Object.entries(pages)){
 for(const [name,w,dsf,maxh] of [['m',432,2.5,4300],['d',960,2,3000]]){
 const ctx=await b.newContext({viewport:{width:w,height:900},deviceScaleFactor:dsf,colorScheme:'light'});
 const pg=await ctx.newPage();
 await pg.route('file:///**',r=>{const u=new URL(r.request().url());let f=decodeURIComponent(u.pathname);if(!fs.existsSync(f)&&fs.existsSync(SITE+f))return r.fulfill({path:SITE+f});r.continue();});
 await pg.goto('file://'+SITE+'/'+p,{waitUntil:'load'});
 await pg.addStyleTag({content:CSS});
 await pg.evaluate(()=>document.fonts.ready);await pg.waitForTimeout(2500);
 const h=await pg.evaluate(()=>document.documentElement.scrollHeight);
 await pg.screenshot({path:`cap_${name}_${l}.png`,fullPage:true,clip:{x:0,y:0,width:w,height:Math.min(h,maxh)}});
 console.log(l,name,h);await ctx.close();}}
await b.close()})();
