const {chromium}=require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const remote={date:'2026-10-08',no:4,blurb:'QA synthetic edition',html:'https://dailydrop.kr/2026-10-08/index.html'};
const fixture='<html><head><title>QA fixture</title></head><body><h1>QA remote edition</h1></body></html>';
(async()=>{
 const browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_PATH});
 const results=[];const errors=[];
 async function context(index,options={}) {
  const c=await browser.newContext({viewport:{width:390,height:844}});
  await c.route('https://dailydrop.kr/**',async r=>{
   if(r.request().url().endsWith('/editions.json')) {
    if(!index)return r.abort();
    return r.fulfill({json:{editions:[remote]},headers:{'access-control-allow-origin':'*'}});
   }
   if(options.delay)await new Promise(resolve=>setTimeout(resolve,options.delay));
   return r.fulfill({body:fixture,contentType:'text/html',headers:{'access-control-allow-origin':'*'}});
  });
  const p=await c.newPage();p.on('pageerror',e=>errors.push(e.message));return {c,p};
 }
 async function open(p){await p.goto('http://127.0.0.1:4181');await p.waitForFunction(()=>document.querySelector('#reader').contentDocument?.body?.innerText?.length>100);}
 try{
  let {c,p}=await context(false);await open(p);
  assert.match(await p.locator('#edition-label').innerText(),/제3호/);results.push('offline startup shows bundled edition');
  await p.locator('#save').click();await p.reload();await p.locator('[data-tab="saved"]').click();await p.locator('.edition-card').waitFor();assert.match(await p.locator('#saved-list').innerText(),/2026-10-07/);results.push('bookmark survives reload');
  await p.locator('[data-tab="glossary"]').click();await p.waitForFunction(()=>document.querySelector('#reader').contentWindow.location.pathname.includes('glossary'));await p.frameLocator('#reader').locator('input').fill('금리');assert.match(await p.frameLocator('#reader').locator('body').innerText(),/금리/);results.push('bundled glossary searchable');
  await c.close();
  ({c,p}=await context(true,{delay:1000}));await open(p);await p.locator('#notice').filter({hasText:'새 호'}).waitFor();results.push('startup remote refresh runs without back button');
  await p.locator('[data-tab="today"]').click();await p.locator('[data-tab="glossary"]').click();await p.waitForTimeout(1500);assert.match(await p.locator('#reader').getAttribute('src'),/glossary/);results.push('late remote download cannot replace selected tab');
  await p.locator('[data-tab="today"]').click();await p.waitForFunction(()=>document.querySelector('#reader').contentDocument?.body?.innerText?.includes('QA remote edition'));await p.locator('#save').click();results.push('downloaded fixture renders and saves');
  await c.unroute('https://dailydrop.kr/**');await c.route('https://dailydrop.kr/**',r=>r.abort());await p.reload();await p.locator('[data-tab="saved"]').click();await p.locator('.edition-card').waitFor();assert.match(await p.locator('#saved-list').innerText(),/2026-10-08/);await p.locator('.edition-card').click();await p.waitForFunction(()=>document.querySelector('#reader').contentDocument?.body?.innerText?.includes('QA remote edition'));results.push('cached remote fixture and bookmark survive offline reload');
  await c.close();assert.deepEqual(errors,[]);
  fs.writeFileSync('qa/browser-results.json',JSON.stringify({passed:results,errors,scope:'Headless Chrome, local bundled app and intercepted synthetic remote index/HTML; no native runtime or push verification'},null,2));console.log(JSON.stringify({passed:results,errors},null,2));
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
