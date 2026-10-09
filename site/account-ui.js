// 데일리드롭 회원 UI: 상단 메뉴 계정 칸(로그인 ↔ 마이페이지)·방문 비콘·호 페이지 북마크(기사·용어)·/login/ · /me/ · /admin/ 페이지.
// build.js 가 불러 쓴다. API는 src/account.js(Worker). 문구는 i18n.json 의 account(빠진 키는 en).
const SVG_BM = '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M6.5 3.5h11v17l-5.5-4.1-5.5 4.1z"/></svg>';
const ACC_LANGS = ['ko', 'en', 'ja', 'zh-TW', 'de', 'fr', 'pt', 'es', 'it', 'nl', 'hi', 'id']; // 계정 화면 문구가 있는 언어
const js = v => JSON.stringify(v).replace(/</g, '\\u003c');

// 상단 메뉴 계정 칸 CSS: 메뉴 오른쪽(언어 풀다운 앞), 얇은 세로줄로 구분. 휴대폰에서 메뉴가 넘치지 않게 글자·간격을 줄인다.
const NAV_CSS = `<style>.dd-nav .dd-r{display:flex;align-items:center;gap:10px;flex-shrink:0}.dd-acct{color:inherit;text-decoration:none;white-space:nowrap;padding-left:10px;border-left:1px solid var(--rule,#b9b1a0);line-height:1.2}.dd-acct[aria-current]{text-decoration:underline;text-underline-offset:3px}.dd-acct.in{color:var(--red,#8d2f22);font-weight:700;position:relative}.dd-acct.in::before{content:'';display:inline-block;width:6px;height:6px;border-radius:50%;background:var(--red,#8d2f22);margin-right:5px;vertical-align:.12em}.dd-acct.in.ic::before{position:absolute;top:0;right:-3px;margin:0}.dd-acct[hidden]{display:none}.dd-acct svg{display:none;width:17px;height:17px;fill:none;stroke:currentColor;stroke-width:1.7;stroke-linecap:round}.dd-acct.ic{padding-left:7px;display:flex;align-items:center;min-height:24px}.dd-acct.ic svg{display:block}.dd-acct.ic .t{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap}.dd-acct.in.ic svg{fill:currentColor;fill-opacity:.18}@media(max-width:480px){.dd-nav .dd-r{gap:7px}.dd-acct{font-size:11px;padding-left:7px;letter-spacing:.02em}}@media(max-width:400px){.dd-nav{gap:6px;padding-left:10px;padding-right:10px}.dd-nav .dd-r{gap:6px}.dd-acct{padding-left:6px}}</style>`;

// 공통 스크립트(모든 페이지, 메뉴 바로 뒤): 로그인 상태(dd_in 힌트 쿠키가 있을 때만 /api/me, 탭마다 sessionStorage 10분 캐시) → 메뉴 '로그인'을 '마이페이지'로.
// 앱(Capacitor) 감지 → 계정 칸·북마크 숨김, 비콘 client='app'. 방문 비콘은 DNT/GPC·자동화 브라우저면 보내지 않는다.
const NAV_JS = `<script>(function(){if(window.__ddAcct)return;window.__ddAcct=1;var d=document,nav=d.querySelector('.dd-nav'),a=d.querySelector('.dd-acct');
function isApp(){try{if(window.Capacitor||/DailyDropApp/.test(navigator.userAgent))return true;if(window.parent!==window&&window.parent.Capacitor)return true;}catch(e){}return !/^https?:$/.test(location.protocol);}
var APP=isApp();window.__ddApp=APP;
try{if(nav&&!nav.hasAttribute('data-keep')&&d.documentElement.lang)localStorage.setItem('dd_lang',d.documentElement.lang);}catch(e){}
var P=null;window.ddMe=function(force){if(APP||!/(?:^|;\\s*)dd_in=1/.test(d.cookie)){try{sessionStorage.removeItem('dd_me');}catch(e){}return Promise.resolve(null);}
if(!force){if(P)return P;try{var c=JSON.parse(sessionStorage.getItem('dd_me')||'null');if(c&&c.u&&Date.now()-c.t<600000)return(P=Promise.resolve(c.u));}catch(e){}}
return(P=fetch('/api/me',{credentials:'same-origin',cache:'no-store'}).then(function(r){return r.ok?r.json():{user:null};}).then(function(j){var u=(j&&j.user)||null;try{if(u)sessionStorage.setItem('dd_me',JSON.stringify({t:Date.now(),u:u}));else sessionStorage.removeItem('dd_me');}catch(e){}return u;}).catch(function(){return null;}));};
function fit(){if(!a||a.hidden)return;a.classList.toggle('ic',window.innerWidth<720);}window.__ddNavFit=fit;
if(a){if(APP)a.hidden=true;else{fit();window.addEventListener('resize',fit);if(d.fonts&&d.fonts.ready)d.fonts.ready.then(fit);window.ddMe().then(function(u){if(!u)return;a.href='/me/';a.querySelector('.t').textContent=a.getAttribute('data-me');a.classList.add('in');a.title=(a.getAttribute('data-me')||'')+' · '+(u.email||'');if(location.pathname==='/me/')a.setAttribute('aria-current','page');else a.removeAttribute('aria-current');fit();});}}
function hit(){try{if(navigator.doNotTrack==='1'||window.doNotTrack==='1'||navigator.globalPrivacyControl||navigator.webdriver||(nav&&nav.hasAttribute('data-nohit')))return;
var p=location.pathname;if(APP){var c=d.querySelector('link[rel=canonical]');try{p=new URL(c.href).pathname;}catch(e){}}
var b=JSON.stringify({path:p,region:(nav&&nav.getAttribute('data-r'))||'',lang:d.documentElement.lang||'',ref:APP?'':d.referrer||'',client:APP?'app':'web'});
if(!APP&&navigator.sendBeacon&&navigator.sendBeacon('/api/hit',b))return;
fetch((APP?'https://dailydropnewspaper.com':'')+'/api/hit',{method:'POST',body:b,keepalive:true,credentials:APP?'omit':'same-origin',headers:{'content-type':'text/plain'}}).catch(function(){});}catch(e){}}
if(d.readyState==='complete')setTimeout(hit,0);else window.addEventListener('load',function(){setTimeout(hit,0);});})();</script>`;

// 메뉴 계정 칸: 정적 HTML은 '로그인', 스크립트가 로그인 상태면 '마이페이지'로 바꾼다.
// 메뉴 줄이 넘치는 좁은 화면·긴 언어에서는 사람 모양 아이콘으로 접는다(글자는 화면 낭독용으로 남김, NAV_JS의 fit)
const SVG_USER = '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><circle cx="12" cy="8.2" r="3.7"/><path d="M4.8 20.2c.9-3.9 3.7-6 7.2-6s6.3 2.1 7.2 6"/></svg>';
const navItem = (A, active) => `<a class="dd-acct" href="/login/" data-me="${A.me}"${active === '/login/' ? ' aria-current="page"' : ''}>${SVG_USER}<span class="t">${A.login}</span></a>`;

// ── 호 페이지 북마크: 큰 기사(.story + h2/h3.hl) 오른쪽 위 책갈피, 용어 카드(.tip)에도 하나. 비로그인 → /login/?next=
const BM_CSS = `<style>.dd-bm{position:absolute;top:-8px;right:-10px;width:36px;height:36px;display:flex;align-items:center;justify-content:center;margin:0;padding:0;border:0;border-radius:50%;background:transparent;color:var(--ink,#121212);cursor:pointer;z-index:3;-webkit-tap-highlight-color:transparent}.dd-bm svg{width:18px;height:18px;display:block;overflow:visible}.dd-bm path{fill:none;stroke:currentColor;stroke-width:1.6;stroke-linejoin:round;transition:fill .15s}.dd-bm:hover{color:var(--red,#8d2f22)}.dd-bm[aria-pressed="true"]{color:var(--red,#8d2f22)}.dd-bm[aria-pressed="true"] path{fill:currentColor}.dd-bm:focus-visible{outline:2px solid var(--red,#8d2f22);outline-offset:-3px}.story.has-bm>.kick{max-width:calc(100% - 28px);box-sizing:border-box}.tip .dd-bm{top:2px;right:2px}.tip.has-bm .tk{padding-right:30px}@media (prefers-reduced-motion:reduce){.dd-bm path{transition:none}}@media print{.dd-bm{display:none}}</style>`;
const bmScript = (region, date, lang, url, A) => `${BM_CSS}<script>(function(){if(window.__ddApp)return;var R=${js(region)},D=${js(date)},LG=${js(lang)},U=${js(url)},L=${js({ bm: A.bm, on: A.bmOn, login: A.loginNeeded })},SVG=${js(SVG_BM)};
var saved={},terms={},logged=/(?:^|;\\s*)dd_in=1/.test(document.cookie);
function mk(){var b=document.createElement('button');b.type='button';b.className='dd-bm';b.innerHTML=SVG;set(b,false);return b;}
function set(b,on){b.setAttribute('aria-pressed',on?'true':'false');var t=on?L.on:(logged?L.bm:L.login);b.setAttribute('aria-label',t);b.title=t;}
function login(data){try{if(data)sessionStorage.setItem('dd_bm_next',JSON.stringify({p:location.pathname,d:data}));}catch(e){}location.href='/login/?next='+encodeURIComponent(location.pathname+location.search);}
function send(m,data){return fetch('/api/bookmarks',{method:m,credentials:'same-origin',headers:{'content-type':'application/json'},body:JSON.stringify(data)}).then(function(r){if(r.status===401){try{sessionStorage.removeItem('dd_me');}catch(e){}document.cookie='dd_in=; Path=/; Max-Age=0';login(data);throw 0;}if(!r.ok)throw 0;});}
function toggle(b,data,store,key){if(!logged){login(data);return;}var on=b.getAttribute('aria-pressed')!=='true';set(b,on);if(on)store[key]=1;else delete store[key];
send(on?'POST':'DELETE',data).catch(function(){set(b,!on);if(on)delete store[key];else store[key]=1;});}
var arts=[];[].forEach.call(document.querySelectorAll('.story[data-id]'),function(s){var h=s.querySelector('h2.hl,h3.hl');if(!h)return;var id=s.getAttribute('data-id'),b=mk();s.insertBefore(b,s.firstChild);s.classList.add('has-bm');arts.push([id,b]);
b.addEventListener('keydown',function(e){e.stopPropagation();});
b.addEventListener('click',function(e){e.preventDefault();e.stopPropagation();toggle(b,{kind:'article',region:R,date:D,lang:LG,ref:id,title:h.textContent.replace(/\\s+/g,' ').trim(),url:U+'#'+id},saved,id);});});
var tip=document.getElementById('tip'),tb=null;
if(tip){tb=mk();tb.addEventListener('keydown',function(e){e.stopPropagation();});tb.addEventListener('click',function(e){e.preventDefault();e.stopPropagation();var k=tip.getAttribute('data-for');if(!k)return;var tx=tip.querySelector('.tx');toggle(tb,{kind:'term',region:R,date:D,lang:LG,ref:k,title:k,url:U,note:tx?tx.textContent.replace(/\\s+/g,' ').trim().slice(0,380):''},terms,k);});
new MutationObserver(function(){if(!tip.contains(tb)){tip.appendChild(tb);tip.classList.add('has-bm');}set(tb,!!terms[tip.getAttribute('data-for')]);}).observe(tip,{childList:true});}
if(logged&&window.ddMe)window.ddMe().then(function(u){if(!u){logged=false;arts.forEach(function(x){set(x[1],false);});return;}
return fetch('/api/bookmarks',{credentials:'same-origin',cache:'no-store'}).then(function(r){return r.ok?r.json():{items:[]};}).then(function(j){(j.items||[]).forEach(function(x){if(x.kind==='article'&&x.region===R&&x.date===D)saved[x.ref]=1;if(x.kind==='term')terms[x.ref]=1;});arts.forEach(function(x){set(x[1],!!saved[x[0]]);});pending();});}).catch(function(){});
// 로그인 전에 누른 북마크: 로그인하고 돌아오면 이어서 저장(기사는 그 자리로 스크롤)
function pending(){var q=null;try{q=JSON.parse(sessionStorage.getItem('dd_bm_next')||'null');sessionStorage.removeItem('dd_bm_next');}catch(e){}if(!q||q.p!==location.pathname||!q.d)return;var dd=q.d;
if(dd.kind==='article'){var hit=arts.filter(function(x){return x[0]===dd.ref;})[0];if(!hit)return;if(!saved[dd.ref]){saved[dd.ref]=1;set(hit[1],true);send('POST',dd).catch(function(){delete saved[dd.ref];set(hit[1],false);});}try{hit[1].parentNode.scrollIntoView({block:'center'});}catch(e){}}
else if(dd.kind==='term'&&!terms[dd.ref]){terms[dd.ref]=1;send('POST',dd).catch(function(){delete terms[dd.ref];});}}})();</script>`;

// ── 계정 페이지 공통 CSS(BASECSS 토큰 위에): 종이 질감·명조 제목·빨강 강조, 다크 모드는 토큰이 처리
const PAGE_CSS = `<style>
main [hidden]{display:none!important}
.acc{max-width:420px;margin:0 auto;padding:40px 16px 64px}
.acc-mast{font-family:"Noto Serif KR",Georgia,serif;font-weight:900;font-size:22px;letter-spacing:-.02em;margin:0 0 18px;text-align:center}.acc-mast i{font-style:normal;color:var(--red)}
.acc h1{text-align:center;font-size:26px;margin:0 0 6px}.acc .lead{text-align:center;margin:0 0 26px}
.acc-rule{border:0;border-top:2px solid var(--ink);margin:0 0 22px}
#g-wrap{min-height:44px;display:flex;justify-content:center;margin:0 0 4px}
.acc-or{display:flex;align-items:center;gap:12px;margin:18px 0;color:var(--mute);font:12px "Noto Sans KR",sans-serif;letter-spacing:.12em}.acc-or::before,.acc-or::after{content:"";flex:1;border-top:1px solid var(--rule)}
.seg{display:flex;border:1px solid var(--ink);margin:0 0 16px}.seg button{flex:1;font:inherit;font-size:14px;padding:9px 6px;background:transparent;color:var(--ink);border:0;cursor:pointer}.seg button+button{border-left:1px solid var(--ink)}.seg button[aria-selected="true"]{background:var(--ink);color:var(--paper);font-weight:700}
.fld{display:block;margin:0 0 12px;font:13px "Noto Sans KR",sans-serif}.fld>span{display:block;margin:0 0 5px;color:var(--ink-2);letter-spacing:.04em}.fld input{width:100%;box-sizing:border-box;font:16px "Noto Sans KR",sans-serif;padding:11px 12px;border:1px solid var(--rule);background:rgba(255,255,255,.35);color:var(--ink);border-radius:0}.fld input:focus{outline:2px solid var(--ink);outline-offset:-1px;border-color:var(--ink)}.fld small{display:block;margin-top:4px;color:var(--mute);font-size:12px}
@media(prefers-color-scheme:dark){:root:not([data-theme="light"]) .fld input{background:rgba(255,255,255,.04)}}:root[data-theme="dark"] .fld input{background:rgba(255,255,255,.04)}
@media(prefers-color-scheme:dark){:root:not([data-theme="light"]) .acc-btn:not(.ghost),:root:not([data-theme="light"]) .danger .acc-btn.solid{color:#14130f}}:root[data-theme="dark"] .acc-btn:not(.ghost),:root[data-theme="dark"] .danger .acc-btn.solid{color:#14130f}
.acc-btn{display:block;width:100%;font:700 15px "Noto Sans KR",sans-serif;letter-spacing:.04em;padding:13px 16px;background:var(--red);color:#fff;border:0;cursor:pointer;margin-top:6px}.acc-btn:disabled{opacity:.6;cursor:wait}.acc-btn.ghost{background:transparent;color:var(--ink);border:1px solid var(--ink)}
.linkbtn{font:inherit;background:none;border:0;padding:0;color:var(--ink);text-decoration:underline;text-underline-offset:3px;cursor:pointer}
.acc-err{color:var(--red);font:13px/1.5 "Noto Sans KR",sans-serif;margin:4px 0 8px}.acc-ok{font:13px/1.5 "Noto Sans KR",sans-serif;color:var(--ink-2);border-left:2px solid var(--red);padding:6px 10px;margin:12px 0}
.acc-legal{text-align:center;margin-top:22px}.acc-legal a{color:inherit}
.code-in{letter-spacing:.5em;text-align:center;font-variant-numeric:tabular-nums}
.me{max-width:760px}.me-h{display:flex;justify-content:space-between;align-items:flex-end;gap:12px;border-bottom:2px solid var(--ink);padding-bottom:10px;margin-bottom:0}.me-h h1{margin:0}.me-h p{margin:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;min-width:0}
.tabs{display:flex;border-bottom:1px solid var(--rule);margin:0 0 6px;overflow-x:auto;scrollbar-width:none}.tabs::-webkit-scrollbar{display:none}.tabs button{font:inherit;font-size:14px;background:none;border:0;border-bottom:2px solid transparent;margin-bottom:-1px;padding:12px 2px;margin-right:22px;color:var(--mute);cursor:pointer;white-space:nowrap}.tabs button[aria-selected="true"]{color:var(--ink);border-bottom-color:var(--red);font-weight:700}.tabs .n{font:12px "Noto Sans KR",sans-serif;font-variant-numeric:tabular-nums;margin-left:5px;color:var(--mute)}
.bm-list{list-style:none;margin:0;padding:0}.bm-it{display:grid;grid-template-columns:1fr 36px;gap:8px;align-items:start;border-bottom:1px solid var(--rule);padding:14px 0}.bm-it a{color:inherit;text-decoration:none;min-width:0}.bm-it a:hover b{text-decoration:underline;text-decoration-color:var(--red);text-underline-offset:4px}.bm-ed{display:block;font:11px "Noto Sans KR",sans-serif;letter-spacing:.08em;color:var(--mute);margin-bottom:3px}.bm-it b{display:block;font-size:17px;line-height:1.4;letter-spacing:-.01em}.bm-it .nt{display:block;color:var(--ink-2);font-size:14px;margin-top:4px;line-height:1.55}
.bm-x{width:36px;height:36px;border:0;background:none;color:var(--mute);font-size:22px;line-height:1;cursor:pointer;border-radius:50%}.bm-x:hover,.bm-x:focus-visible{color:var(--red);background:rgba(0,0,0,.05)}
.empty{text-align:center;padding:48px 12px 40px;border-bottom:1px solid var(--rule)}.empty svg{width:34px;height:34px;color:var(--red)}.empty svg path{fill:none;stroke:currentColor;stroke-width:1.4;stroke-linejoin:round}.empty p{max-width:360px;margin:12px auto 6px;color:var(--ink-2)}
.kv{display:grid;grid-template-columns:max-content 1fr;gap:10px 18px;margin:18px 0 22px;font-size:15px}.kv dt{color:var(--mute);font:13px/1.65 "Noto Sans KR",sans-serif}.kv dd{margin:0;min-width:0;overflow-wrap:anywhere}
.badge{display:inline-block;font:11px "Noto Sans KR",sans-serif;letter-spacing:.06em;border:1px solid currentColor;padding:1px 6px;margin-left:6px;vertical-align:1px}.badge.ok{color:var(--ink-2)}.badge.no{color:var(--red)}
.acts{display:flex;flex-wrap:wrap;gap:10px;margin:8px 0 0}.acts .acc-btn{width:auto;display:inline-block}
.danger{margin-top:34px;border-top:1px solid var(--rule);padding-top:16px}.danger .acc-btn{background:transparent;color:var(--red);border:1px solid var(--red)}.danger .acc-btn.solid{background:var(--red);color:#fff}
</style>`;

const pick = (I18N, l) => ({ ...I18N.en.account, ...(I18N[l] || {}).account });

// 계정 화면 공통 런타임: 언어 고르기(?lang > 마지막으로 본 페이지 언어 > 브라우저 > ko), data-t 문구 바꾸기, 메뉴 라벨·국가판 링크 바꾸기
const RUNTIME = (I18N, NAVLBL, regions) => `<script>var DDA=(function(){var S=${js(Object.fromEntries(ACC_LANGS.map(l => [l, pick(I18N, l)])))},N=${js(NAVLBL)},RG=${js(regions)};
function choose(){var q=new URLSearchParams(location.search).get('lang');if(q&&S[q])return q;try{var s=localStorage.getItem('dd_lang');if(s&&S[s])return s;if(s&&S[s.split('-')[0]])return s.split('-')[0];}catch(e){}var ls=navigator.languages||[navigator.language||'ko'];for(var i=0;i<ls.length;i++){var l=String(ls[i]);if(/^zh-(TW|HK|Hant)/i.test(l))return 'zh-TW';l=l.split('-')[0];if(S[l])return l;}return 'ko';}
var L=choose(),T=S[L];try{if(new URLSearchParams(location.search).get('lang'))localStorage.setItem('dd_lang',L);}catch(e){}
var m=document.cookie.match(/(?:^|;\\s*)dd_region=([A-Z]{2})/),R=m&&RG[m[1]]?m[1]:'KR',pre=RG[R]?RG[R].p:'';
document.documentElement.lang=L;
[].forEach.call(document.querySelectorAll('[data-t]'),function(el){var k=el.getAttribute('data-t');if(T[k]!=null)el.textContent=T[k];});
[].forEach.call(document.querySelectorAll('[data-tp]'),function(el){var k=el.getAttribute('data-tp');if(T[k]!=null)el.setAttribute('placeholder',T[k]);});
var nl=N[L]||N.en,links=document.querySelectorAll('.dd-links a'),K=['','archive/','glossary/','about/','settings/'];[].forEach.call(links,function(a,i){if(nl[i])a.textContent=nl[i];a.href='/'+pre+K[i];});
var acc=document.querySelector('.dd-acct');if(acc){acc.querySelector('.t').textContent=acc.classList.contains('in')?T.me:T.login;acc.setAttribute('data-me',T.me);if(window.__ddNavFit)window.__ddNavFit();}
var sm=document.querySelector('.dd-lang summary');if(sm)sm.textContent=N[L]?N[L][5]:L.toUpperCase();
function fmtDate(d){try{var p=d.split('-');return new Intl.DateTimeFormat(L,{year:'numeric',month:'short',day:'numeric',timeZone:'UTC'}).format(Date.UTC(+p[0],p[1]-1,+p[2]));}catch(e){return d;}}
function safeNext(){var n=new URLSearchParams(location.search).get('next')||'';return /^\\/(?!\\/)[^\\s\\\\]*$/.test(n)&&n.indexOf('/login/')!==0?n:'/me/';}
function api(m,p,b){return fetch(p,{method:m,credentials:'same-origin',cache:'no-store',headers:b?{'content-type':'application/json'}:{},body:b?JSON.stringify(b):undefined}).then(function(r){return r.json().catch(function(){return {};}).then(function(j){j.status=r.status;return j;});}).catch(function(){return {status:0};});}
function err(code){return T['e_'+code]||T.e_generic;}
function remember(u){try{if(u)sessionStorage.setItem('dd_me',JSON.stringify({t:Date.now(),u:u}));else sessionStorage.removeItem('dd_me');}catch(e){}}
return {L:L,T:T,R:R,pre:pre,RG:RG,fmtDate:fmtDate,safeNext:safeNext,api:api,err:err,remember:remember};})();</script>`;

module.exports = function build(C) {
  const { fs, path, OUT, esc, I18N, HEAD, FONTS, BASECSS, NAV, NAVSCROLL, NAVL, NAV_KEYS, LANGCODE, COUNTRIES, REGIONS, LIVE, latestKR } = C;
  const ko = pick(I18N, 'ko');
  // 메뉴 라벨(5칸 + 언어 코드)·국가판 접두어·국기
  const NAVLBL = Object.fromEntries(ACC_LANGS.map(l => [l, [...NAV_KEYS.map(k => NAVL(l, k)), LANGCODE(l)]]));
  NAVLBL.ko = [REGIONS.KR.latest, REGIONS.KR.archive, REGIONS.KR.glossary, REGIONS.KR.about, REGIONS.KR.settings, LANGCODE('ko')];
  const RG = Object.fromEntries(COUNTRIES.filter(c => LIVE.has(c.code)).map(c => [c.code, { p: REGIONS[c.code].prefix, f: c.flag || '' }]));
  for (const c of COUNTRIES) if (!RG[c.code]) RG[c.code] = { p: REGIONS[c.code].prefix, f: c.flag || '' };
  const langVariants = page => ({ cur: 'ko', variants: ACC_LANGS.map(l => [l, `${page}?lang=${encodeURIComponent(l)}`]) });
  const write = (sub, html) => { fs.mkdirSync(path.join(OUT, sub), { recursive: true }); fs.writeFileSync(path.join(OUT, sub, 'index.html'), html); };
  // 계정 화면 메뉴: 언어 풀다운은 같은 화면의 ?lang= 로. 이 페이지 언어를 '마지막 본 언어'로 기억하지 않고(data-keep), 관리자 화면은 비콘도 보내지 않음
  // 화면 언어가 바뀌면(영어 등) 메뉴 글자가 길어지므로 휴대폰에선 메뉴 줄 안 가로 스크롤(NAVSCROLL)
  const navFor = (page, extra = '') => NAV(page, 'KR', langVariants(page)).replace('<nav class="dd-nav"', `<nav class="dd-nav" data-keep${extra}`).replace('</nav>', NAVSCROLL + '</nav>');
  const GCID = String(process.env.DD_GOOGLE_CLIENT_ID || '').trim();
  const okGcid = /^[\w.-]+\.apps\.googleusercontent\.com$/.test(GCID) ? GCID : '';
  const runtime = RUNTIME(I18N, NAVLBL, RG);
  const robots = '<meta name="robots" content="noindex">';
  const head = (title, desc, p) => HEAD(title, desc, p).replace('</head>', robots + '</head>');

  // ── /login/: Google로 계속하기 → '또는' → 이메일(로그인/회원가입 전환) → (인증 메일이 켜져 있으면) '이메일을 확인하세요' 단계
  write('login', head('데일리드롭 — 로그인', '데일리드롭 로그인·회원가입', '/login/') + FONTS + BASECSS + PAGE_CSS + navFor('/login/') + `<main class="acc">
<p class="acc-mast"><span class="dd-logo" role="img" aria-label="DailyDrop." style="width:170px;margin:0 auto">DailyDrop.</span></p>
<section id="step-main">
<h1 data-t="title">${ko.title}</h1><p class="mute lead" data-t="lead">${ko.lead}</p>
<hr class="acc-rule">
<div id="g-wrap" hidden><div id="g-btn"></div></div>
<div class="acc-or" id="g-or" hidden><span data-t="or">${ko.or}</span></div>
<div class="seg" role="tablist"><button type="button" role="tab" aria-selected="true" data-mode="login" data-t="tabLogin">${ko.tabLogin}</button><button type="button" role="tab" aria-selected="false" data-mode="signup" data-t="tabSignup">${ko.tabSignup}</button></div>
<form id="f" novalidate>
<label class="fld" id="f-name" hidden><span data-t="name">${ko.name}</span><input name="name" autocomplete="name" maxlength="60"></label>
<label class="fld"><span data-t="email">${ko.email}</span><input name="email" type="email" inputmode="email" autocomplete="email" autocapitalize="off" spellcheck="false" required maxlength="254"></label>
<label class="fld"><span data-t="password">${ko.password}</span><input name="password" type="password" autocomplete="current-password" required minlength="8" maxlength="200"><small id="pw-hint" hidden data-t="pwHint">${ko.pwHint}</small></label>
<p class="acc-err" id="err" role="alert" hidden></p>
<button class="acc-btn" type="submit" id="go" data-t="submitLogin">${ko.submitLogin}</button>
</form>
<p class="mute acc-legal" id="legal"></p>
</section>
<section id="step-check" hidden>
<h1 data-t="checkTitle">${ko.checkTitle}</h1><p class="mute lead" id="check-lead"></p>
<hr class="acc-rule">
<form id="fc" novalidate><label class="fld"><span data-t="code">${ko.code}</span><input class="code-in" name="code" inputmode="numeric" autocomplete="one-time-code" pattern="[0-9]{6}" maxlength="6" required></label>
<p class="acc-err" id="err2" role="alert" hidden></p>
<button class="acc-btn" type="submit" data-t="verify">${ko.verify}</button></form>
<p class="acc-legal mute"><button type="button" class="linkbtn" id="resend" data-t="resend">${ko.resend}</button> · <a id="later" href="/me/" data-t="later">${ko.later}</a></p>
</section>
</main>${runtime}<script>(function(){var A=DDA,T=A.T,f=document.getElementById('f'),mode='login',next=A.safeNext(),GCID=${js(okGcid)};
var lg=document.getElementById('legal');lg.textContent='';var parts=T.privacy.split('{privacy}');lg.appendChild(document.createTextNode(parts[0]||''));var pl=document.createElement('a');pl.href='/privacy/';pl.textContent=T.privacyLink;lg.appendChild(pl);lg.appendChild(document.createTextNode(parts[1]||''));
function show(id,msg){var e=document.getElementById(id);e.textContent=msg||'';e.hidden=!msg;}
function setMode(m){mode=m;[].forEach.call(document.querySelectorAll('.seg button'),function(b){b.setAttribute('aria-selected',b.getAttribute('data-mode')===m?'true':'false');});document.getElementById('f-name').hidden=m!=='signup';document.getElementById('pw-hint').hidden=m!=='signup';f.password.setAttribute('autocomplete',m==='signup'?'new-password':'current-password');document.getElementById('go').textContent=m==='signup'?T.submitSignup:T.submitLogin;show('err','');}
[].forEach.call(document.querySelectorAll('.seg button'),function(b){b.addEventListener('click',function(){setMode(b.getAttribute('data-mode'));});});
if(location.hash==='#signup')setMode('signup');
function done(j,fresh){A.remember(j.user);if(fresh&&j.verify&&j.user&&!j.user.verified){document.getElementById('step-main').hidden=true;document.getElementById('step-check').hidden=false;document.getElementById('check-lead').textContent=T.checkLead.replace('{email}',j.user.email);document.getElementById('later').href=next;document.querySelector('#fc input').focus();return;}location.replace(next);}
f.addEventListener('submit',function(e){e.preventDefault();var em=f.email.value.trim(),pw=f.password.value;if(!/^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/.test(em)){show('err',T.e_email);f.email.focus();return;}if(pw.length<8){show('err',mode==='signup'?T.e_password:T.e_invalid_login);f.password.focus();return;}
var b=document.getElementById('go');b.disabled=true;show('err','');A.api('POST','/api/auth/'+(mode==='signup'?'signup':'login'),mode==='signup'?{email:em,password:pw,name:f.name.value.trim()}:{email:em,password:pw}).then(function(j){b.disabled=false;if(j.ok){f.password.value='';done(j,mode==='signup');}else show('err',A.err(j.error));});});
document.getElementById('fc').addEventListener('submit',function(e){e.preventDefault();var c=this.code.value.replace(/\\D/g,'');A.api('POST','/api/auth/email/verify',{code:c}).then(function(j){if(j.ok){A.remember(j.user);location.replace(next);}else show('err2',A.err(j.error));});});
document.getElementById('resend').addEventListener('click',function(){A.api('POST','/api/auth/email/send').then(function(j){show('err2',j.ok?'✓':A.err(j.error));});});
// 이미 로그인돼 있으면 바로 돌아간다
if(window.ddMe)window.ddMe(true).then(function(u){if(u)location.replace(next);});
// Google Identity Services: 클라이언트 ID(빌드 때 DD_GOOGLE_CLIENT_ID, 없으면 Worker 설정)가 있을 때만 버튼을 보인다
function gsi(id){if(!id)return;var s=document.createElement('script');s.src='https://accounts.google.com/gsi/client';s.async=true;s.onload=function(){try{var dark=matchMedia('(prefers-color-scheme: dark)').matches&&document.documentElement.getAttribute('data-theme')!=='light'||document.documentElement.getAttribute('data-theme')==='dark';
google.accounts.id.initialize({client_id:id,ux_mode:'popup',callback:function(r){show('err','');A.api('POST','/api/auth/google',{credential:r.credential}).then(function(j){if(j.ok)done(j,false);else show('err',A.err(j.error==='google_invalid'||j.error==='google_conflict'?'google':j.error));});}});
var w=Math.min(400,document.getElementById('g-wrap').parentNode.clientWidth||320);google.accounts.id.renderButton(document.getElementById('g-btn'),{type:'standard',theme:dark?'filled_black':'outline',size:'large',text:'continue_with',shape:'rectangular',logo_alignment:'center',width:w,locale:A.L});document.getElementById('g-wrap').hidden=false;document.getElementById('g-or').hidden=false;}catch(e){}};document.head.appendChild(s);}
if(GCID)gsi(GCID);else A.api('GET','/api/auth/config').then(function(j){if(j&&j.google)gsi(j.google);});
})();</script></body></html>`);

  // ── /me/: 기사 북마크 · 용어 북마크 · 계정
  const empty = (k, href) => `<div class="empty" id="e-${k}" hidden>${SVG_BM}<p data-t="${k === 'article' ? 'emptyArticles' : 'emptyTerms'}">${k === 'article' ? ko.emptyArticles : ko.emptyTerms}</p><a class="btn" id="e-${k}-a" href="${href}" data-t="${k === 'article' ? 'readLatest' : 'glossaryLink'}">${k === 'article' ? ko.readLatest : ko.glossaryLink}</a></div>`;
  write('me', head('데일리드롭 — 마이페이지', '북마크한 기사와 용어', '/me/') + FONTS + BASECSS + PAGE_CSS + navFor('/me/') + `<main class="me">
<header class="me-h"><h1 data-t="me">${ko.me}</h1><p class="mute" id="who"></p></header>
<div class="tabs" role="tablist" aria-label="${esc(ko.me)}">
<button type="button" role="tab" id="t-article" aria-controls="p-article" aria-selected="true"><span data-t="tabArticles">${ko.tabArticles}</span><span class="n" id="n-article"></span></button>
<button type="button" role="tab" id="t-term" aria-controls="p-term" aria-selected="false"><span data-t="tabTerms">${ko.tabTerms}</span><span class="n" id="n-term"></span></button>
<button type="button" role="tab" id="t-account" aria-controls="p-account" aria-selected="false"><span data-t="tabAccount">${ko.tabAccount}</span></button>
</div>
<section id="p-article" role="tabpanel" aria-labelledby="t-article"><p class="mute" id="loading" data-t="loading">${ko.loading}</p><ul class="bm-list" id="l-article"></ul>${empty('article', '/')}</section>
<section id="p-term" role="tabpanel" aria-labelledby="t-term" hidden><ul class="bm-list" id="l-term"></ul>${empty('term', '/glossary/')}</section>
<section id="p-account" role="tabpanel" aria-labelledby="t-account" hidden>
<dl class="kv"><dt data-t="email">${ko.email}</dt><dd id="a-email"></dd><dt data-t="method">${ko.method}</dt><dd id="a-method"></dd><dt data-t="joined">${ko.joined}</dt><dd id="a-joined"></dd></dl>
<div id="a-verify"></div>
<div class="acts"><button type="button" class="acc-btn ghost" id="logout" data-t="logout">${ko.logout}</button></div>
<div class="danger"><button type="button" class="acc-btn" id="del" data-t="del">${ko.del}</button>
<div id="del-c" hidden><p class="acc-err" data-t="delConfirm">${ko.delConfirm}</p><div class="acts"><button type="button" class="acc-btn solid" id="del-y" data-t="delYes">${ko.delYes}</button><button type="button" class="acc-btn ghost" id="del-n" data-t="cancel">${ko.cancel}</button></div></div></div>
</section>
</main>${runtime}<script>(function(){var A=DDA,T=A.T,SVG=${js(SVG_BM)};
document.getElementById('e-article-a').href='/'+A.pre;document.getElementById('e-term-a').href='/'+A.pre+'glossary/';
var tabs=['article','term','account'];function tab(k,push){tabs.forEach(function(t){document.getElementById('t-'+t).setAttribute('aria-selected',t===k?'true':'false');document.getElementById('p-'+t).hidden=t!==k;});if(push)try{history.replaceState(null,'',k==='article'?location.pathname+location.search:'#'+k);}catch(e){}}
tabs.forEach(function(t){document.getElementById('t-'+t).addEventListener('click',function(){tab(t,true);});});
document.querySelector('.tabs').addEventListener('keydown',function(e){var i=tabs.indexOf((document.activeElement.id||'').slice(2));if(i<0)return;if(e.key==='ArrowRight'||e.key==='ArrowLeft'){e.preventDefault();var n=tabs[(i+(e.key==='ArrowRight'?1:2))%3];tab(n,true);document.getElementById('t-'+n).focus();}});
var h=location.hash.slice(1);if(tabs.indexOf(h)>=0)tab(h,false);
function ed(x){var r=A.RG[x.region]||{};return (r.f?r.f+' ':'')+(x.date?A.fmtDate(x.date):'');}
function counts(){['article','term'].forEach(function(k){var n=document.getElementById('l-'+k).children.length;document.getElementById('n-'+k).textContent=n?String(n):'';document.getElementById('e-'+k).hidden=n>0;});}
function item(x){var li=document.createElement('li');li.className='bm-it';var a=document.createElement('a');a.href=x.url||('/'+((A.RG[x.region]||{}).p||'')+x.date+'/');var m=document.createElement('span');m.className='bm-ed';m.textContent=ed(x);var b=document.createElement('b');b.textContent=x.title||x.ref;a.appendChild(m);a.appendChild(b);
if(x.kind==='term'&&x.note){var n=document.createElement('span');n.className='nt';n.textContent=x.note;a.appendChild(n);}
var del=document.createElement('button');del.type='button';del.className='bm-x';del.setAttribute('aria-label',T.remove+': '+(x.title||x.ref));del.textContent='×';
del.addEventListener('click',function(){var nx=li.nextElementSibling||li.previousElementSibling;li.remove();counts();if(nx){var f=nx.querySelector('.bm-x');if(f)f.focus();}A.api('DELETE','/api/bookmarks',{id:x.id}).then(function(j){if(!j.ok){load();}});});
li.appendChild(a);li.appendChild(del);return li;}
function load(){A.api('GET','/api/bookmarks').then(function(j){document.getElementById('loading').hidden=true;if(j.status===401){location.replace('/login/?next=/me/');return;}var la=document.getElementById('l-article'),lt=document.getElementById('l-term');la.textContent='';lt.textContent='';(j.items||[]).forEach(function(x){(x.kind==='term'?lt:la).appendChild(item(x));});counts();});}
function badge(ok,t){var s=document.createElement('span');s.className='badge '+(ok?'ok':'no');s.textContent=t;return s;}
function account(u,verify){document.getElementById('who').textContent=u.name?u.name:u.email;var e=document.getElementById('a-email');e.textContent=u.email;e.appendChild(badge(u.verified,u.verified?T.verified:T.unverified));
document.getElementById('a-method').textContent=u.method==='both'?'Google · '+T.email:u.method==='google'?'Google':T.email;
var d=new Date(u.created_at);document.getElementById('a-joined').textContent=isNaN(d)?'':A.fmtDate(d.toISOString().slice(0,10));
var v=document.getElementById('a-verify');v.textContent='';if(!u.verified){var p=document.createElement('p');p.className='acc-ok';if(verify){var b=document.createElement('button');b.type='button';b.className='linkbtn';b.textContent=T.resend;b.addEventListener('click',function(){A.api('POST','/api/auth/email/send').then(function(j){if(!j.ok){p.textContent=A.err(j.error);return;}p.textContent=T.checkLead.replace('{email}',u.email);var fm=document.createElement('form');fm.className='acts';fm.innerHTML='<input class="code-in" style="font:16px sans-serif;padding:9px;max-width:9em;border:1px solid var(--rule);background:transparent;color:inherit" inputmode="numeric" autocomplete="one-time-code" maxlength="6" aria-label="'+T.code+'"><button class="acc-btn" type="submit">'+T.verify+'</button>';fm.addEventListener('submit',function(e){e.preventDefault();A.api('POST','/api/auth/email/verify',{code:fm.querySelector('input').value}).then(function(r){if(r.ok){A.remember(r.user);location.reload();}else p.firstChild.textContent=A.err(r.error)+' ';});});p.appendChild(fm);});});p.appendChild(document.createTextNode(T.unverified+' · '));p.appendChild(b);}else p.textContent=T.soon;v.appendChild(p);}
if(u.admin){var ad=document.createElement('a');ad.className='acc-btn ghost';ad.href='/admin/';ad.textContent='Admin →';document.querySelector('#p-account .acts').appendChild(ad);}}
A.api('GET','/api/me').then(function(j){if(!j.user){A.remember(null);location.replace('/login/?next=/me/');return;}A.remember(j.user);account(j.user,j.verify);load();});
document.getElementById('logout').addEventListener('click',function(){A.api('POST','/api/auth/logout').then(function(){A.remember(null);location.replace('/'+A.pre);});});
document.getElementById('del').addEventListener('click',function(){this.hidden=true;document.getElementById('del-c').hidden=false;document.getElementById('del-n').focus();});
document.getElementById('del-n').addEventListener('click',function(){document.getElementById('del-c').hidden=true;var d=document.getElementById('del');d.hidden=false;d.focus();});
document.getElementById('del-y').addEventListener('click',function(){var b=this;b.disabled=true;A.api('DELETE','/api/me',{confirm:true}).then(function(j){if(j.ok){A.remember(null);location.replace('/'+A.pre);}else{b.disabled=false;}});});
})();</script></body></html>`);

  // ── /admin/: 방문 리포트(관리자 전용). 데이터는 /api/admin/stats?range= (Worker가 ADMIN_EMAILS·이메일 인증 확인, 아니면 403)
  write('admin', head('데일리드롭 — 방문 리포트', '관리자 전용', '/admin/') + FONTS + BASECSS + PAGE_CSS + ADMIN_CSS + navFor('/admin/', ' data-nohit') + `<main class="adm">
<header class="adm-h"><div><p class="eyebrow">ADMIN · 관리자 전용</p><h1>방문 리포트</h1><p class="mute" id="asof"></p></div>
<div class="seg rng" role="radiogroup" aria-label="기간"><button type="button" role="radio" data-r="7" aria-checked="false">7일</button><button type="button" role="radio" data-r="30" aria-checked="true">30일</button><button type="button" role="radio" data-r="90" aria-checked="false">90일</button></div></header>
<div id="gate" class="gate"><p class="mute">불러오는 중…</p></div>
<div id="dash" hidden>
<section class="kpis" id="kpis" aria-label="요약"></section>
<section class="card2"><h2>최근 48시간 · 시간별 페이지뷰 <small>KST</small></h2><div class="chart" id="c48"></div></section>
<section class="card2"><h2>일별 페이지뷰 <small id="rng-l"></small></h2><div class="chart" id="cday"></div></section>
<div class="cols">
<section class="card2"><h2>국가판</h2><div id="b-regions"></div></section>
<section class="card2"><h2>언어</h2><div id="b-langs"></div></section>
<section class="card2"><h2>웹 · 앱</h2><div id="b-clients"></div></section>
<section class="card2"><h2>기기</h2><div id="b-devices"></div></section>
<section class="card2 wide"><h2>많이 본 페이지</h2><div id="b-pages"></div></section>
<section class="card2"><h2>유입 경로</h2><div id="b-refs"></div></section>
<section class="card2"><h2>접속 국가</h2><div id="b-countries"></div></section>
</div>
<h2 class="sec">회원</h2>
<section class="kpis" id="members" aria-label="회원"></section>
<section class="card2"><h2>일별 신규 가입</h2><div class="chart" id="csign"></div></section>
<h2 class="sec">북마크</h2>
<section class="kpis" id="bmk" aria-label="북마크"></section>
<div class="cols">
<section class="card2"><h2>많이 북마크한 기사</h2><div id="b-barts"></div></section>
<section class="card2"><h2>많이 북마크한 용어</h2><div id="b-bterms"></div></section>
<section class="card2"><h2>독자가 많이 누른 용어 <small>최신 한국판 · 오늘의 단어 집계</small></h2><div id="b-clicks"></div></section>
</div>
<p class="mute foot">순방문자(UV)는 날짜별 익명 해시(IP·브라우저·날짜)로 셉니다. 여러 날 합계는 '일별 순방문자의 합'입니다. IP 원문은 저장하지 않으며 DNT·GPC를 켠 방문, 봇은 집계하지 않습니다. 앱 집계는 앱 화면 보안 정책(connect-src)에 dailydropnewspaper.com이 허용돼야 들어옵니다.</p>
</div>
</main><script>${ADMIN_JS(latestKR)}</script></body></html>`);
};
module.exports.NAV_CSS = NAV_CSS;
module.exports.NAV_JS = NAV_JS;
module.exports.navItem = navItem;
module.exports.bmScript = bmScript;
module.exports.pick = pick;

// ── 관리자 대시보드 CSS·JS (외부 라이브러리 없이 인라인 SVG)
const ADMIN_CSS = `<style>
.adm{max-width:1120px;padding:24px 16px 64px}
.adm-h{display:flex;justify-content:space-between;align-items:flex-end;flex-wrap:wrap;gap:12px;border-bottom:2px solid var(--ink);padding-bottom:12px;margin-bottom:18px}.adm-h h1{margin:0}.adm-h p{margin:0}
.eyebrow{font:700 11px "Noto Sans KR",sans-serif;letter-spacing:.2em;color:var(--red);margin:0 0 4px}
.rng{margin:0;min-width:210px}.rng button{padding:7px 10px;font-size:13px}.rng button[aria-checked="true"]{background:var(--ink);color:var(--paper);font-weight:700}
.gate{padding:40px 0;text-align:center}
.kpis{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:0;border-top:1px solid var(--ink);border-left:1px solid var(--rule);margin:0 0 18px}
.kpi{border-right:1px solid var(--rule);border-bottom:1px solid var(--rule);padding:12px 14px 10px;min-width:0}
.kpi .k{font:12px "Noto Sans KR",sans-serif;color:var(--mute);letter-spacing:.04em}.kpi .v{font:900 28px/1.2 "Noto Serif KR",Georgia,serif;font-variant-numeric:tabular-nums;letter-spacing:-.02em;margin:4px 0 2px}.kpi .s{font:12px "Noto Sans KR",sans-serif;color:var(--ink-2);font-variant-numeric:tabular-nums}
.d{font:700 12px "Noto Sans KR",sans-serif;font-variant-numeric:tabular-nums;margin-left:4px}.d.up{color:var(--red)}.d.dn{color:var(--ink-2)}.d.eq{color:var(--mute)}
.card2{border-top:1px solid var(--ink);padding:10px 0 14px;min-width:0}.card2 h2{font-size:15px;margin:0 0 10px;border:0;padding:0}.card2 h2 small{font:400 11px "Noto Sans KR",sans-serif;color:var(--mute);letter-spacing:.04em;margin-left:6px}
.cols{display:grid;grid-template-columns:repeat(auto-fit,minmax(300px,1fr));gap:0 28px}.cols .wide{grid-column:1/-1}
.sec{font-size:20px;margin:30px 0 12px;border-bottom:2px solid var(--ink);padding-bottom:6px}
.bars{display:grid;gap:4px;font:13px "Noto Sans KR",sans-serif}
.bar{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:10px;align-items:center;position:relative;padding:4px 6px;min-height:22px}
.bar::before{content:"";position:absolute;left:0;top:2px;bottom:2px;width:var(--w);background:var(--red);opacity:.16;border-radius:0 4px 4px 0}
.bar span{position:relative;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.bar span a{color:inherit}.bar b{position:relative;font-weight:700;font-variant-numeric:tabular-nums}.bar b small{font-weight:400;color:var(--mute);margin-left:6px}
.chart{position:relative;width:100%}.chart svg{display:block;width:100%;height:auto;overflow:visible}.chart .ax{font:10px "Noto Sans KR",sans-serif;fill:var(--mute)}.chart .gl{stroke:var(--rule);stroke-width:1;opacity:.7}.chart .ln{fill:none;stroke:var(--red);stroke-width:2;stroke-linejoin:round;stroke-linecap:round}.chart .ar{fill:var(--red);opacity:.1}.chart .bx{fill:var(--red)}.chart .hv{fill:transparent}.chart .cx{stroke:var(--ink);stroke-width:1;opacity:0}.chart .dot{fill:var(--red);stroke:var(--paper);stroke-width:2;opacity:0}
.tt{position:absolute;pointer-events:none;background:var(--paper);border:1px solid var(--ink);padding:6px 9px;font:12px/1.45 "Noto Sans KR",sans-serif;font-variant-numeric:tabular-nums;white-space:nowrap;box-shadow:0 6px 18px rgba(0,0,0,.15);z-index:5;transform:translate(-50%,-100%);margin-top:-10px}.tt[hidden]{display:none}.tt b{display:block}
.none{color:var(--mute);font:13px "Noto Sans KR",sans-serif;padding:6px 0}
.foot{margin-top:28px}
@media(max-width:480px){.kpi .v{font-size:23px}.kpis{grid-template-columns:repeat(2,minmax(0,1fr))}.adm-h{align-items:stretch}.rng{width:100%}}
</style>`;

const ADMIN_JS = (latestKR) => `(function(){var range=30,data=null,LATEST=${js(latestKR)};
var $=function(id){return document.getElementById(id);};
function n(v){return (v||0).toLocaleString('ko-KR');}
function esc(s){return String(s==null?'':s).replace(/[&<>"]/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c];});}
function delta(a,b){if(!b&&!a)return '<span class="d eq">–</span>';if(!b)return '<span class="d up">신규</span>';var p=Math.round((a-b)/b*100);return '<span class="d '+(p>0?'up':p<0?'dn':'eq')+'" title="이전 기간 '+n(b)+'">'+(p>0?'▲':p<0?'▼':'')+Math.abs(p)+'%</span>';}
function kpi(k,v,prev,sub){return '<div class="kpi"><div class="k">'+esc(k)+'</div><div class="v">'+n(v)+(prev!==undefined?delta(v,prev):'')+'</div>'+(sub?'<div class="s">'+sub+'</div>':'')+'</div>';}
var RN={KR:'🇰🇷 한국',US:'🇺🇸 미국',JP:'🇯🇵 일본'},CL={web:'웹',app:'앱'},DV={mobile:'휴대폰',tablet:'태블릿',desktop:'데스크톱'};
function rname(k){try{if(/^[A-Z]{2}$/.test(k)){var f=String.fromCodePoint.apply(null,k.split('').map(function(c){return 127397+c.charCodeAt(0);}));return RN[k]||(f+' '+new Intl.DisplayNames(['ko'],{type:'region'}).of(k));}}catch(e){}return k;}
function lname(k){try{return k&&k!=='-'?new Intl.DisplayNames(['ko'],{type:'language'}).of(k)+' ('+k+')':k;}catch(e){return k;}}
function bars(id,rows,label,opt){opt=opt||{};var el=$(id);if(!rows||!rows.length){el.innerHTML='<p class="none">아직 데이터가 없습니다.</p>';return;}var max=Math.max.apply(null,rows.map(function(r){return r.pv!=null?r.pv:r.n;}))||1;
el.innerHTML='<div class="bars" role="list">'+rows.map(function(r){var v=r.pv!=null?r.pv:r.n;var l=label?label(r):r.k;return '<div class="bar" role="listitem" style="--w:'+Math.max(2,Math.round(v/max*100))+'%" title="'+esc(typeof l==='string'?l:'')+'"><span>'+(opt.html?l:esc(l))+'</span><b>'+n(v)+(r.uv!=null?'<small>UV '+n(r.uv)+'</small>':'')+(r.users!=null?'<small>'+n(r.users)+'명</small>':'')+'</b></div>';}).join('')+'</div>';}
// 한 계열 선/막대 그래프 + 마우스·터치 툴팁(가까운 점)
function chart(id,pts,kind,fmtX,tip){var el=$(id);if(!pts.length){el.innerHTML='<p class="none">아직 데이터가 없습니다.</p>';return;}var W=Math.max(300,el.clientWidth||600),H=W<500?170:210,pl=36,pr=8,pt=10,pb=22,iw=W-pl-pr,ih=H-pt-pb;
var max=Math.max.apply(null,pts.map(function(p){return p.v;}));var raw=Math.max(1,max)/3,mag=Math.pow(10,Math.floor(Math.log10(raw))),st=[1,2,5,10].map(function(k){return k*mag;}).filter(function(v){return v>=raw;})[0];st=Math.max(1,st);var top=st*3;
var N=pts.length,X=function(i){return kind==='bar'?pl+(i+0.5)*iw/N:pl+(N<2?iw/2:i*iw/(N-1));},Y=function(v){return pt+ih-(v/top)*ih;};
var s='<svg viewBox="0 0 '+W+' '+H+'" role="img" aria-label="'+esc(id)+'">';for(var g=0;g<=3;g++){var gv=top*g/3,gy=Y(gv);s+='<line class="gl" x1="'+pl+'" x2="'+(W-pr)+'" y1="'+gy+'" y2="'+gy+'"/><text class="ax" x="'+(pl-6)+'" y="'+(gy+3)+'" text-anchor="end">'+(gv>=1000?Math.round(gv/100)/10+'k':Math.round(gv*10)/10)+'</text>';}
var every=Math.ceil(N/(W<500?5:8));pts.forEach(function(p,i){if(i%every===0||i===N-1&&N<12)s+='<text class="ax" x="'+X(i)+'" y="'+(H-6)+'" text-anchor="middle">'+esc(fmtX(p))+'</text>';});
if(kind==='bar'){var bw=Math.max(2,Math.min(26,iw/N-2));pts.forEach(function(p,i){var y=Y(p.v),h=pt+ih-y;if(h>0){var r=Math.min(4,bw/2,h);s+='<path class="bx" d="M'+(X(i)-bw/2)+' '+(pt+ih)+'V'+(y+r)+'Q'+(X(i)-bw/2)+' '+y+' '+(X(i)-bw/2+r)+' '+y+'H'+(X(i)+bw/2-r)+'Q'+(X(i)+bw/2)+' '+y+' '+(X(i)+bw/2)+' '+(y+r)+'V'+(pt+ih)+'Z"/>';}});}
else{var d=pts.map(function(p,i){return (i?'L':'M')+X(i).toFixed(1)+' '+Y(p.v).toFixed(1);}).join('');s+='<path class="ar" d="'+d+'L'+X(N-1)+' '+(pt+ih)+'L'+X(0)+' '+(pt+ih)+'Z"/><path class="ln" d="'+d+'"/>';}
s+='<line class="cx" y1="'+pt+'" y2="'+(pt+ih)+'"/><circle class="dot" r="4"/><rect class="hv" x="'+pl+'" y="0" width="'+iw+'" height="'+H+'"/></svg><div class="tt" hidden></div>';el.innerHTML=s;
var svg=el.querySelector('svg'),tt=el.querySelector('.tt'),cx=el.querySelector('.cx'),dot=el.querySelector('.dot');
function at(e){var r=svg.getBoundingClientRect(),x=(e.clientX-r.left)*W/r.width;var i=kind==='bar'?Math.floor((x-pl)/(iw/N)):Math.round((x-pl)/(iw/Math.max(1,N-1)));i=Math.max(0,Math.min(N-1,i));var p=pts[i];
cx.setAttribute('x1',X(i));cx.setAttribute('x2',X(i));cx.style.opacity=.35;if(kind!=='bar'){dot.setAttribute('cx',X(i));dot.setAttribute('cy',Y(p.v));dot.style.opacity=1;}tt.innerHTML=tip(p);tt.hidden=false;tt.style.left=(X(i)/W*r.width)+'px';tt.style.top=(Y(p.v)/H*r.height)+'px';}
function off(){tt.hidden=true;cx.style.opacity=0;dot.style.opacity=0;}
svg.addEventListener('pointermove',at);svg.addEventListener('pointerdown',at);svg.addEventListener('pointerleave',off);}
function days(from,to){var out=[],t=Date.parse(from+'T00:00:00Z'),e=Date.parse(to+'T00:00:00Z');for(;t<=e;t+=864e5)out.push(new Date(t).toISOString().slice(0,10));return out;}
function md(d){return (+d.slice(5,7))+'/'+(+d.slice(8,10));}
function render(){var D=data,T=D.totals;$('asof').textContent='기준 '+new Date(D.generated_at).toLocaleString('ko-KR',{timeZone:'Asia/Seoul'})+' (KST) · '+D.from+' ~ '+D.today;$('rng-l').textContent='최근 '+D.range+'일';
$('kpis').innerHTML=kpi('오늘 페이지뷰',T.today.pv,T.today.prev.pv,'어제 '+n(T.today.prev.pv))+kpi('오늘 순방문자',T.today.uv,T.today.prev.uv,'어제 '+n(T.today.prev.uv))+kpi('7일 페이지뷰',T.d7.pv,T.d7.prev.pv,'UV '+n(T.d7.uv)+delta(T.d7.uv,T.d7.prev.uv))+kpi('30일 페이지뷰',T.d30.pv,T.d30.prev.pv,'UV '+n(T.d30.uv)+delta(T.d30.uv,T.d30.prev.uv))+kpi('신규 가입 ('+D.range+'일)',T.signups.range,T.signups.prev,'오늘 '+n(T.signups.today))+kpi('전체 회원',D.members.total,undefined,'7일 활동 '+n(D.members.active7));
// 48시간: 빈 시간도 0으로
var H={};D.hourly.forEach(function(h){H[h.t]=h;});var now=Math.floor(Date.now()/36e5)*36e5,hp=[];for(var t=now-47*36e5;t<=now;t+=36e5){var x=H[t]||{pv:0,uv:0};hp.push({t:t,v:x.pv,uv:x.uv});}
var hh=function(t){return new Date(t).toLocaleString('ko-KR',{timeZone:'Asia/Seoul',hour:'numeric',hour12:false});};
chart('c48',hp,'line',function(p){return hh(p.t).replace('시','')+'시';},function(p){return '<b>'+new Date(p.t).toLocaleString('ko-KR',{timeZone:'Asia/Seoul',month:'numeric',day:'numeric',hour:'numeric'})+'</b>PV '+n(p.v)+' · UV '+n(p.uv);});
var DM={};D.daily.forEach(function(x){DM[x.day]=x;});var dp=days(D.from,D.today).map(function(d){var x=DM[d]||{pv:0,uv:0};return {d:d,v:x.pv,uv:x.uv};});
chart('cday',dp,'bar',function(p){return md(p.d);},function(p){return '<b>'+p.d+'</b>PV '+n(p.v)+' · UV '+n(p.uv);});
bars('b-regions',D.regions,function(r){return rname(r.k);});bars('b-langs',D.langs,function(r){return lname(r.k);});bars('b-clients',D.clients,function(r){return CL[r.k]||r.k;});bars('b-devices',D.devices,function(r){return DV[r.k]||r.k;});
bars('b-pages',D.pages,function(r){return '<a href="'+esc(r.k)+'">'+esc(r.k)+'</a>';},{html:1});bars('b-refs',D.refs);bars('b-countries',D.countries,function(r){return rname(r.k);});
var M=D.members;$('members').innerHTML=kpi('전체 회원',M.total)+kpi('이메일 인증',M.verified)+kpi('Google 연결',M.google)+kpi('7일 활동 회원',M.active7);
var SM={};M.signups.forEach(function(x){SM[x.day]=x.n;});chart('csign',days(D.from,D.today).map(function(d){return {d:d,v:SM[d]||0};}),'bar',function(p){return md(p.d);},function(p){return '<b>'+p.d+'</b>신규 가입 '+n(p.v)+'명';});
var BK={article:{n:0,users:0},term:{n:0,users:0}};D.bookmarks.kinds.forEach(function(k){BK[k.k]=k;});$('bmk').innerHTML=kpi('기사 북마크',BK.article.n,undefined,n(BK.article.users)+'명이 저장')+kpi('용어 북마크',BK.term.n,undefined,n(BK.term.users)+'명이 저장');
bars('b-barts',D.bookmarks.articles,function(r){return '<a href="'+esc(r.url||('/'+r.date+'/'))+'">'+esc(rname(r.region).split(' ')[0]+' '+r.date+' · '+(r.title||r.ref))+'</a>';},{html:1});
bars('b-bterms',D.bookmarks.terms,function(r){return r.ref;});}
function clicks(){if(!LATEST){bars('b-clicks',[]);return;}fetch('/api/term/top?r=KR&d='+LATEST+'&l=ko').then(function(r){return r.json();}).then(function(j){bars('b-clicks',(j.top||[]).map(function(x){return {k:x.t,n:x.n};}));}).catch(function(){bars('b-clicks',[]);});}
function gate(html){$('gate').innerHTML=html;$('gate').hidden=false;$('dash').hidden=true;}
function load(){fetch('/api/admin/stats?range='+range,{credentials:'same-origin',cache:'no-store'}).then(function(r){return r.json().then(function(j){j.status=r.status;return j;});}).then(function(j){
if(j.status===401){gate('<p>관리자 전용 페이지입니다. 먼저 로그인하세요.</p><p><a class="btn" href="/login/?next=/admin/">로그인 →</a></p>');return;}
if(j.status===403){gate('<p><b>관리자 전용</b></p><p class="mute">이 계정에는 권한이 없습니다. (관리자 이메일은 Google 로그인 또는 이메일 인증이 필요합니다.)</p>');return;}
if(!j.ok){gate('<p class="mute">통계를 불러오지 못했습니다 ('+esc(j.error||j.status)+').</p>');return;}
data=j;$('gate').hidden=true;$('dash').hidden=false;render();clicks();}).catch(function(){gate('<p class="mute">통계를 불러오지 못했습니다.</p>');});}
[].forEach.call(document.querySelectorAll('.rng button'),function(b){b.addEventListener('click',function(){range=+b.getAttribute('data-r');[].forEach.call(document.querySelectorAll('.rng button'),function(x){x.setAttribute('aria-checked',x===b?'true':'false');});load();});});
var rt;window.addEventListener('resize',function(){clearTimeout(rt);rt=setTimeout(function(){if(data)render();},200);});
load();setInterval(function(){if(!document.hidden)load();},300000);})();`;
