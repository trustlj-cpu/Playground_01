// Render the existing website SVG at Android launcher resource sizes.
const fs=require('node:fs');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE || 'playwright');
(async()=>{const browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_PATH});
try{const p=await browser.newPage({deviceScaleFactor:1});const svg=fs.readFileSync('web/content/icon-512.svg','utf8');const uri='data:image/svg+xml;base64,'+Buffer.from(svg).toString('base64');
for(const [density,size,fg] of [['mdpi',48,108],['hdpi',72,162],['xhdpi',96,216],['xxhdpi',144,324],['xxxhdpi',192,432]]){
 const root='android/app/src/main/res/mipmap-'+density;
 await p.setViewportSize({width:size,height:size});await p.setContent(`<style>html,body{margin:0;width:100%;height:100%;overflow:hidden}body{display:block}img{display:block;width:100%;height:100%}</style><img src="${uri}">`);await p.locator('img').evaluate(x=>x.decode());await p.locator('img').screenshot({path:root+'/ic_launcher.png'});fs.copyFileSync(root+'/ic_launcher.png',root+'/ic_launcher_round.png');
 await p.setViewportSize({width:fg,height:fg});await p.setContent(`<style>html,body{margin:0;width:100%;height:100%;overflow:hidden}body{display:grid;place-items:center}img{width:66%;height:66%}</style><img src="${uri}">`);await p.locator('img').evaluate(x=>x.decode());await p.screenshot({path:root+'/ic_launcher_foreground.png',omitBackground:true});
}
}finally{await browser.close()}})().catch(e=>{console.error(e);process.exitCode=1});
