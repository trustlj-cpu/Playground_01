import { Preferences } from '@capacitor/preferences';
import { Browser } from '@capacitor/browser';
import { App } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';
import { decodeSaved,toggleSaved,externalURL } from './state.mjs';
import { loadRemoteIndex, getCachedRemoteIndex, mergeEditions, ensureEditionSrc, getPushState, enablePush, disablePush, bindPushTap, bindDeepLinks } from './remote.mjs';
const APP_VERSION='0.2.0';
const $=s=>document.querySelector(s), frame=$('#reader'), notice=$('#notice');
const bundled=await (await fetch('editions.json')).json();
// 캐시된 원격 호까지 합친 뒤 보관 표시를 복원(원격 호 보관이 사라지지 않게)
let editions=mergeEditions(bundled,await getCachedRemoteIndex()), latest=editions.at(-1); let selected=latest.date, tab='today', saved=[];
try{saved=decodeSaved((await Preferences.get({key:'dailydrop.saved.v1'})).value,editions);}catch{notice.textContent='보관함을 불러오지 못했습니다. 이번 실행에서 읽기는 가능합니다.';}
function updateSave(){const e=editions.find(e=>e.date===selected);$('#save').hidden=!e||tab==='saved';$('#save').textContent=saved.includes(selected)?'보관 해제':'호 보관';$('#save').setAttribute('aria-pressed',String(saved.includes(selected)));$('#edition-label').textContent=e?`제${e.no}호 · ${e.date} · ${e.source==='remote'?'받아온 호':'오프라인 사본'}`:{archive:'지난 호 · 오프라인 사본',glossary:'용어사전 · 오프라인 사본',saved:'이 기기의 보관함'}[tab]??'';}
let showSeq=0;
function show(next,date){const seq=++showSeq;tab=next;selected=date??(next==='today'?latest.date:null);document.querySelectorAll('[data-tab]').forEach(b=>b.dataset.tab===tab?b.setAttribute('aria-current','page'):b.removeAttribute('aria-current'));frame.hidden=next==='saved';$('#saved').hidden=next!=='saved';if(next==='saved'){renderSaved();}else{const e=editions.find(x=>x.date===selected);if(e&&e.source==='remote'){frame.removeAttribute('src');notice.textContent='호를 불러오는 중…';ensureEditionSrc(e).then(src=>{if(seq!==showSeq)return;frame.src=src;notice.textContent='';}).catch(()=>{if(seq!==showSeq)return;notice.textContent='이 호를 아직 받지 못했습니다. 인터넷 연결 후 다시 눌러 주세요.';});}else{frame.src=selected?`content/${selected}/index.html`:`content/${next}/index.html`;}}updateSave();}
function renderSaved(){const list=$('#saved-list');list.replaceChildren();const entries=editions.filter(e=>saved.includes(e.date)).reverse();if(!entries.length){list.textContent='아직 보관한 호가 없습니다. 읽는 화면에서 호 보관을 눌러 주세요.';return;}for(const e of entries){const b=document.createElement('button');b.className='edition-card';const title=document.createElement('b');title.textContent=`제${e.no}호 · ${e.date}`;b.append(title,document.createTextNode(e.blurb));b.addEventListener('click',()=>show('today',e.date));list.append(b);}}
async function openExternal(value){const url=externalURL(value);if(!url)return;try{await Browser.open({url});}catch{notice.textContent='외부 페이지를 열지 못했습니다. 네트워크 연결을 확인해 주세요.';}}
document.querySelectorAll('[data-tab]').forEach(b=>b.addEventListener('click',()=>show(b.dataset.tab)));
$('#site').addEventListener('click',()=>openExternal('https://dailydrop.kr/'));
$('#save').addEventListener('click',async()=>{if(!selected)return;const next=toggleSaved(saved,selected);try{await Preferences.set({key:'dailydrop.saved.v1',value:JSON.stringify(next)});saved=next;updateSave();notice.textContent=saved.includes(selected)?'이 호를 보관했습니다.':'보관 표시를 해제했습니다. 앱에 담긴 호는 계속 읽을 수 있습니다.';}catch{notice.textContent='보관하지 못했습니다. 기기 저장 공간을 확인해 주세요.';}});
window.addEventListener('message',e=>{if(e.source!==frame.contentWindow||e.origin!==location.origin)return;const m=e.data;if(m?.type==='external')openExternal(m.url);if(m?.type==='page'){const match=/^\/content\/(\d{4}-\d{2}-\d{2})\//.exec(m.path)||/\/editions\/(\d{4}-\d{2}-\d{2})\.html$/.exec(m.path);selected=match&&editions.some(x=>x.date===match[1])?match[1]:m.path==='/content/index.html'?latest.date:null;if(selected)tab='today';else if(m.path.startsWith('/content/archive/'))tab='archive';else if(m.path.startsWith('/content/glossary/'))tab='glossary';else tab='info';document.querySelectorAll('[data-tab]').forEach(b=>{if(b.dataset.tab===tab)b.setAttribute('aria-current','page');else b.removeAttribute('aria-current');});updateSave();}});
if(Capacitor.isNativePlatform())App.addListener('backButton',()=>{const doc=frame.contentDocument;const tip=doc?.getElementById('tip');const overlay=doc?.getElementById('ov');if(tip&&!tip.hidden){tip.hidden=true;return;}if(overlay&&!overlay.hidden){doc.getElementById('close')?.click();return;}if(tab!=='today'||selected!==latest.date){show('today');return;}App.exitApp();});
frame.addEventListener('load',()=>{if(!frame.contentDocument?.body?.textContent?.trim())notice.textContent='신문을 불러오지 못했습니다. 지난 호 메뉴에서 다시 선택해 주세요.';});
show('today');
// 새 호 갱신: 실패해도 번들로 계속 동작. latest가 바뀌면 안내 + 백그라운드로 미리 받아 둔다.
async function refreshEditions(){const r=await loadRemoteIndex();if(!r.editions.length)return;const merged=mergeEditions(bundled,r.editions);const prevLatest=latest.date;editions=merged;latest=editions.at(-1);if(latest.date!==prevLatest){notice.textContent=`새 호(제${latest.no}호 · ${latest.date})가 나왔습니다. 최근 호를 누르면 열립니다.`;ensureEditionSrc(latest).catch(()=>{});}if(tab==='saved')renderSaved();updateSave();}
refreshEditions().catch(()=>{});setInterval(()=>refreshEditions().catch(()=>{}),30*60*1000);
// 알림 켜기/끄기
const pushBtn=$('#push');
async function paintPush(){const st=await getPushState();pushBtn.hidden=!Capacitor.isNativePlatform();pushBtn.textContent=st==='on'?'알림 끄기':'알림 켜기';pushBtn.setAttribute('aria-pressed',String(st==='on'));}
pushBtn.addEventListener('click',async()=>{pushBtn.disabled=true;try{if(await getPushState()==='on'){const r=await disablePush();notice.textContent=r.ok?'저녁판 알림을 껐습니다.':'알림 서버에 연결하지 못해 아직 켜져 있습니다. 잠시 후 다시 눌러 주세요.';}else{const r=await enablePush({appVersion:APP_VERSION,onOpenEdition:d=>openByDate(d)});notice.textContent=r.ok?'저녁판이 나오면 알려 드립니다.':{denied:'알림 권한이 꺼져 있습니다. 설정에서 허용해 주세요.',unsupported:'이 환경에서는 알림을 지원하지 않습니다.','server-error':'알림 서버에 연결하지 못했습니다. 잠시 후 다시 시도해 주세요.'}[r.state]||'알림을 켜지 못했습니다.';}}catch{notice.textContent='알림 설정을 바꾸지 못했습니다.';}pushBtn.disabled=false;paintPush();});
paintPush();
function openByDate(d){if(d==='latest')d=latest.date;if(editions.some(e=>e.date===d))show('today',d);else refreshEditions().then(()=>{if(editions.some(e=>e.date===d))show('today',d);}).catch(()=>{});}
bindPushTap(openByDate);
bindDeepLinks(openByDate);
