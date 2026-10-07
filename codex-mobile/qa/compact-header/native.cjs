const {_android}=require(process.env.PLAYWRIGHT_MODULE);
const {execFileSync}=require('node:child_process');const fs=require('node:fs');const assert=require('node:assert/strict');
const adb=process.env.ADB_PATH,base=['-P','5038','-s','emulator-5580'];
const run=(...a)=>execFileSync(adb,[...base,...a],{timeout:30000});
let d,p;const checks=[];
const shot=async n=>{await p.waitForTimeout(500);fs.writeFileSync(`qa/compact-header/${n}.png`,run('exec-out','screencap','-p'));};
(async()=>{try{
 d=(await _android.devices({port:5038,omitDriverInstall:true})).find(x=>x.serial()==='emulator-5580');
 const v=d.webViews().find(x=>x.pkg()==='kr.dailydrop.app')||await d.waitForEvent('webview',{predicate:x=>x.pkg()==='kr.dailydrop.app',timeout:60000});p=await v.page();p.setDefaultTimeout(30000);
 await p.waitForFunction(()=>document.querySelector('#reader')?.contentDocument?.querySelector('[data-id="nuri"] h2'));
 const metrics=await p.evaluate(()=>{const r=document.querySelector('#reader'),doc=r.contentDocument,h=doc.querySelector('[data-id="nuri"] h2');return {viewport:innerHeight,width:innerWidth,readerTop:r.getBoundingClientRect().top,firstHeadlineTop:r.getBoundingClientRect().top+h.getBoundingClientRect().top,toolbarHeight:document.querySelector('header').getBoundingClientRect().height};});
 assert.ok(metrics.firstHeadlineTop<300);checks.push('first headline above 300 CSS px');await shot('01-latest');
 await p.locator('#app-options summary').click();assert.equal(await p.locator('#site').isVisible(),true);assert.equal(await p.locator('#push').isDisabled(),true);await shot('02-options');await p.frameLocator('#reader').locator('.mast h1').click({position:{x:10,y:10}});await p.waitForFunction(()=>!document.querySelector('#app-options').open);await p.locator('#app-options summary').click();run('shell','input','keyevent','4');await p.waitForFunction(()=>!document.querySelector('#app-options').open);checks.push('More retains website and unconfigured push; reader click and Android Back close menu');
 const f=p.frameLocator('#reader');await f.locator('[data-id="nuri"] h2').click();await f.locator('#ov .term').first().click();await p.waitForFunction(()=>!document.querySelector('#reader').contentDocument.querySelector('#tip').hidden);await shot('03-term');run('shell','input','keyevent','4');await p.waitForFunction(()=>document.querySelector('#reader').contentDocument.querySelector('#tip').hidden&&!document.querySelector('#reader').contentDocument.querySelector('#ov').hidden);run('shell','input','keyevent','4');await p.waitForFunction(()=>document.querySelector('#reader').contentDocument.querySelector('#ov').hidden);checks.push('article and term open; native Back closes term then article');
 await p.locator('[data-tab="archive"]').click();await p.waitForFunction(()=>document.querySelector('#reader').contentWindow.location.pathname.includes('archive'));assert.equal(await f.locator('.dd-nav').isVisible(),true);checks.push('archive navigation remains visible');
 const editions=[];
 for(const date of ['2026-10-05','2026-10-06']){
 await f.locator(`a[href*="${date}"]`).first().click();await p.waitForFunction(date=>document.querySelector('#reader').contentWindow.location.pathname.includes(date),date);
 editions.push(await p.evaluate(()=>{const r=document.querySelector('#reader'),doc=r.contentDocument;return {path:doc.location.pathname,css:!!doc.querySelector('#dd-inapp'),firstHeadlineTop:r.getBoundingClientRect().top+doc.querySelector('h2').getBoundingClientRect().top,scrollWidth:doc.documentElement.scrollWidth,clientWidth:doc.documentElement.clientWidth};}));
 await shot(date);await p.locator('[data-tab="archive"]').click();await p.waitForFunction(()=>document.querySelector('#reader').contentWindow.location.pathname.includes('archive'));
 }
 assert.ok(editions.every(e=>e.css&&e.firstHeadlineTop<300&&e.scrollWidth<=e.clientWidth));checks.push('editions 1 and 2 compact without horizontal overflow');
 await p.locator('[data-tab="glossary"]').click();await f.locator('input').fill('금리');assert.match(await f.locator('body').innerText(),/금리/);checks.push('glossary search');
 await p.locator('[data-tab="saved"]').click();await p.locator('.edition-card').waitFor();checks.push('saved issue remains present after APK upgrade');
 await p.locator('[data-tab="today"]').click();await p.waitForFunction(()=>document.querySelector('#reader')?.contentDocument?.querySelector('[data-id="nuri"] h2'));await shot('04-final');
 fs.writeFileSync('qa/compact-header/native-results.json',JSON.stringify({metrics,editions,checks,scope:'Actual Android API36 emulator WebView; not physical device; no push delivery'},null,2));console.log(JSON.stringify({metrics,editions,checks}));
 }finally{if(d)await d.close();}})().catch(e=>{console.error(e);process.exitCode=1});
