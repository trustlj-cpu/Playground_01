import { Preferences } from '@capacitor/preferences';
import { Browser } from '@capacitor/browser';
import { App } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';
import { decodeSaved,toggleSaved,externalURL } from './state.mjs';
const $=s=>document.querySelector(s), frame=$('#reader'), notice=$('#notice');
const editions=await (await fetch('editions.json')).json();
const latest=editions.at(-1); let selected=latest.date, tab='today', saved=[];
try{saved=decodeSaved((await Preferences.get({key:'dailydrop.saved.v1'})).value,editions);}catch{notice.textContent='보관함을 불러오지 못했습니다. 이번 실행에서 읽기는 가능합니다.';}
function updateSave(){const e=editions.find(e=>e.date===selected);$('#save').hidden=!e||tab==='saved';$('#save').textContent=saved.includes(selected)?'보관 해제':'호 보관';$('#save').setAttribute('aria-pressed',String(saved.includes(selected)));$('#edition-label').textContent=e?`제${e.no}호 · ${e.date} · 오프라인 사본`:{archive:'지난 호 · 오프라인 사본',glossary:'용어사전 · 오프라인 사본',saved:'이 기기의 보관함'}[tab]??'';}
function show(next,date){tab=next;selected=date??(next==='today'?latest.date:null);document.querySelectorAll('[data-tab]').forEach(b=>b.dataset.tab===tab?b.setAttribute('aria-current','page'):b.removeAttribute('aria-current'));frame.hidden=next==='saved';$('#saved').hidden=next!=='saved';if(next==='saved'){renderSaved();}else{frame.src=selected?`content/${selected}/index.html`:`content/${next}/index.html`;}updateSave();}
function renderSaved(){const list=$('#saved-list');list.replaceChildren();const entries=editions.filter(e=>saved.includes(e.date)).reverse();if(!entries.length){list.textContent='아직 보관한 호가 없습니다. 읽는 화면에서 호 보관을 눌러 주세요.';return;}for(const e of entries){const b=document.createElement('button');b.className='edition-card';const title=document.createElement('b');title.textContent=`제${e.no}호 · ${e.date}`;b.append(title,document.createTextNode(e.blurb));b.addEventListener('click',()=>show('today',e.date));list.append(b);}}
async function openExternal(value){const url=externalURL(value);if(!url)return;try{await Browser.open({url});}catch{notice.textContent='외부 페이지를 열지 못했습니다. 네트워크 연결을 확인해 주세요.';}}
document.querySelectorAll('[data-tab]').forEach(b=>b.addEventListener('click',()=>show(b.dataset.tab)));
$('#site').addEventListener('click',()=>openExternal('https://dailydrop.kr/'));
$('#save').addEventListener('click',async()=>{if(!selected)return;const next=toggleSaved(saved,selected);try{await Preferences.set({key:'dailydrop.saved.v1',value:JSON.stringify(next)});saved=next;updateSave();notice.textContent=saved.includes(selected)?'이 호를 보관했습니다.':'보관 표시를 해제했습니다. 앱에 담긴 호는 계속 읽을 수 있습니다.';}catch{notice.textContent='보관하지 못했습니다. 기기 저장 공간을 확인해 주세요.';}});
window.addEventListener('message',e=>{if(e.source!==frame.contentWindow||e.origin!==location.origin)return;const m=e.data;if(m?.type==='external')openExternal(m.url);if(m?.type==='page'){const match=/^\/content\/(\d{4}-\d{2}-\d{2})\//.exec(m.path);selected=match&&editions.some(x=>x.date===match[1])?match[1]:m.path==='/content/index.html'?latest.date:null;if(selected)tab='today';else if(m.path.startsWith('/content/archive/'))tab='archive';else if(m.path.startsWith('/content/glossary/'))tab='glossary';else tab='info';document.querySelectorAll('[data-tab]').forEach(b=>{if(b.dataset.tab===tab)b.setAttribute('aria-current','page');else b.removeAttribute('aria-current');});updateSave();}});
if(Capacitor.isNativePlatform())App.addListener('backButton',()=>{const doc=frame.contentDocument;const tip=doc?.getElementById('tip');const overlay=doc?.getElementById('ov');if(tip&&!tip.hidden){tip.hidden=true;return;}if(overlay&&!overlay.hidden){doc.getElementById('close')?.click();return;}if(tab!=='today'||selected!==latest.date){show('today');return;}App.exitApp();});
frame.addEventListener('load',()=>{if(!frame.contentDocument?.body?.textContent?.trim())notice.textContent='신문을 불러오지 못했습니다. 지난 호 메뉴에서 다시 선택해 주세요.';});
show('today');
