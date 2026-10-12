// 기사 읽어주기(한국판 1면, 관리자만 보임): ① 빌드 때 /<날짜>/tts.json(지면 글자 그대로의 읽기 자료) ② 1면 화면 스크립트.
// 화면: 맨 위 메뉴 줄(사람 아이콘 왼쪽)에 전체 재생 아이콘, 기사마다 재생 → 공유 → 북마크 같은 크기·같은 간격, 재생하면 맨 아래 고정 재생 막대.
// 관리자 판정은 /api/me 의 admin(서버의 ADMIN_EMAILS). 관리자가 아니면 아무것도 만들지 않고, 음성 API(/api/tts/*)도 서버에서 403.
const js = v => JSON.stringify(v).replace(/</g, '\\u003c');
const plain = x => String(x || '').replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/\s+/g, ' ').trim();

// 지면(편집본 HTML)에서 1면 기사들을 지면 순서대로: 분야·제목·부제·본문 + 팝업 자료(A)의 네 코너
function ttsData(html, date) {
  let A = {}; const m = html.match(/const A = (\{[\s\S]*?\n  \});\n/); if (m) { try { A = new Function('return ' + m[1])(); } catch (_) { A = {}; } }
  const re = /<(article|div)\b[^>]*class="[^"]*\bstory\b[^"]*"[^>]*data-id="([\w-]+)"[^>]*>/g; const starts = []; let x;
  while ((x = re.exec(html))) starts.push({ tag: x[1], id: x[2], at: x.index, end: re.lastIndex });
  const stories = [];
  starts.forEach((s, i) => {
    let blk = html.slice(s.end, i + 1 < starts.length ? starts[i + 1].at : html.length);
    if (s.tag === 'article') blk = blk.split('</article>')[0];
    else blk = blk.split(/<\/div>\s*(?:\n|$)/)[0];
    blk = blk.replace(/<div class="fill[\s\S]*$/, ''); // 오늘의 숫자·단어 등 곁들이 상자는 기사 아님
    const a = A[s.id] || {};
    let cat = '', title = '', deck = '', body = [];
    if (s.tag === 'article') {
      const k = blk.match(/<div class="kick">([\s\S]*?)(?:<span|<\/div>)/); cat = k ? plain(k[1]) : '';
      const h = blk.match(/<h[23] class="hl">([\s\S]*?)<\/h[23]>/); title = h ? plain(h[1].replace(/<br\s*\/?>/g, ' ')) : '';
      const d = blk.match(/<p class="deck">([\s\S]*?)<\/p>/); deck = d ? plain(d[1]) : '';
      const b = blk.match(/<div class="(?:body|one)">([\s\S]*?)<\/div>/); if (b) body = (b[1].match(/<p\b[^>]*>[\s\S]*?<\/p>/g) || []).map(plain).filter(Boolean);
    } else {
      const h = blk.match(/<b>([\s\S]*?)<\/b>/); title = h ? plain(h[1]) : '';
      const e = blk.match(/<em>([\s\S]*?)<\/em>/); if (e) body = [plain(e[1])];
      const k = blk.match(/<span>([\s\S]*?)<\/span>/); cat = k ? plain(k[1]).split(/\s·\s/)[0] : '';
    }
    if (!title) return;
    if (!cat) cat = plain(a.kick).split(/\s·\s/)[0];
    const corners = {}; for (const key of ['me', 'a', 'b', 'say']) if (a[key]) corners[key] = plain(a[key]);
    stories.push({ id: s.id, cat, title, deck, body, corners });
  });
  return { date, region: 'KR', lang: 'ko', stories };
}

const ICON = {
  play: '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M8 5.2v13.6L18.6 12z"/></svg>',
  pause: '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M9 5.5v13M15 5.5v13"/></svg>',
  prev: '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M6.5 5.5v13M18 5.8v12.4L9.2 12z"/></svg>',
  next: '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M17.5 5.5v13M6 5.8v12.4L14.8 12z"/></svg>',
};
// 재생 아이콘 위치: 공유(.dd-sh, 오른쪽 15px·폭 34·아이콘 오른쪽 여백 2)와 북마크(.dd-bm) 아이콘 사이 간격(18px 간격)을 그대로 한 칸 더 → 오른쪽 33px
const CSS = `<style>
.dd-pl{position:absolute;top:-8px;right:33px;width:34px;height:36px;display:flex;align-items:center;justify-content:flex-end;margin:0;padding:0 2px 0 0;box-sizing:border-box;border:0;border-radius:50%;background:transparent;color:var(--ink,#121212);cursor:pointer;z-index:5;-webkit-tap-highlight-color:transparent}
.dd-pl svg,.dd-tts-all svg{width:18px;height:18px;display:block;overflow:visible}.dd-pl path,.dd-tts-all path,#dd-tts path{fill:none;stroke:currentColor;stroke-width:1.6;stroke-linecap:round;stroke-linejoin:round}
.dd-pl:hover,.dd-pl[aria-pressed="true"]{color:var(--red,#8d2f22)}.dd-pl:focus-visible,.dd-tts-all:focus-visible,#dd-tts button:focus-visible{outline:2px solid var(--red,#8d2f22);outline-offset:-3px}
.story.has-bm.dd-has-pl>.kick{max-width:calc(100% - 76px)!important}
.dd-tts-all{display:flex;align-items:center;justify-content:center;width:24px;height:24px;margin:0;padding:0;border:0;background:transparent;color:inherit;cursor:pointer;-webkit-tap-highlight-color:transparent}.dd-tts-all svg{width:14px;height:14px}.dd-tts-all[aria-pressed="true"]{color:var(--red,#8d2f22)}
@keyframes ddTtsPulse{0%,100%{color:inherit}50%{color:#e2765f}}
.story.dd-tts-on,.story.dd-tts-on *{animation:ddTtsPulse 2.8s ease-in-out infinite}
.story.dd-tts-on .fill,.story.dd-tts-on .fill *,.story.dd-tts-on .dd-bm,.story.dd-tts-on .dd-sh,.story.dd-tts-on .dd-pl,.story.dd-tts-on .dd-bm *,.story.dd-tts-on .dd-sh *,.story.dd-tts-on .dd-pl *{animation:none}
@media (prefers-reduced-motion:reduce){.story.dd-tts-on,.story.dd-tts-on *{animation:none!important}.story.dd-tts-on>:not(.fill):not(.dd-bm):not(.dd-sh):not(.dd-pl),.story.dd-tts-on>:not(.fill):not(.dd-bm):not(.dd-sh):not(.dd-pl) *{color:#c4553f!important}}
#dd-tts{position:fixed;left:0;right:0;bottom:0;z-index:9000;background:var(--paper,#ece4d8);color:var(--ink,#121212);border-top:1px solid var(--ink,#121212);box-shadow:0 -6px 18px rgba(0,0,0,.12);padding:8px 16px calc(8px + env(safe-area-inset-bottom,0px));font:500 13px/1.3 "Noto Sans KR",system-ui,sans-serif;box-sizing:border-box}
#dd-tts .in{max-width:1180px;margin:0 auto;display:flex;flex-direction:column;gap:6px}
#dd-tts .r1,#dd-tts .r2{display:flex;align-items:center;gap:8px;min-width:0}
#dd-tts .now{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-family:"Noto Serif KR",Georgia,serif;font-weight:700;font-size:14px}
#dd-tts .st{color:var(--mute,#6f6f6f);font-size:12px;white-space:nowrap}
#dd-tts button{font:inherit;color:inherit;background:transparent;border:1px solid transparent;border-radius:18px;min-width:36px;height:36px;padding:0 8px;display:inline-flex;align-items:center;justify-content:center;cursor:pointer;-webkit-tap-highlight-color:transparent}
#dd-tts button svg{width:20px;height:20px}
#dd-tts .pp{border-color:var(--ink,#121212)}
#dd-tts .sp{border-color:var(--rule,#b9b1a0);font-variant-numeric:tabular-nums;min-width:52px}
#dd-tts .md{display:inline-flex;border:1px solid var(--ink,#121212);border-radius:18px;overflow:hidden;margin-left:auto}#dd-tts .md button{border-radius:0;height:34px;padding:0 10px;border:0}#dd-tts .md button[aria-pressed="true"]{background:var(--ink,#121212);color:var(--paper,#ece4d8);font-weight:700}
#dd-tts .x{border-color:var(--rule,#b9b1a0)}
@media(max-width:400px){#dd-tts{padding-left:10px;padding-right:10px}#dd-tts .r2{gap:4px}#dd-tts .md button{padding:0 8px}}
@media(prefers-color-scheme:dark){:root:not([data-theme="light"]) #dd-tts{box-shadow:0 -6px 18px rgba(0,0,0,.5)}}
@media print{.dd-pl,.dd-tts-all,#dd-tts{display:none}}
</style>`;

const ttsScript = date => `${CSS}<script>(function(){if(window.__ddApp||window.__ddTts)return;window.__ddTts=1;
if(!/(?:^|;\\s*)dd_in=1/.test(document.cookie)||!window.ddMe)return;
var D=${js(date)},IC=${js(ICON)};
window.ddMe().then(function(u){if(u&&(u.admin===true||u.preview===true))init();}).catch(function(){});
function init(){var d=document,stories=[].slice.call(d.querySelectorAll('.story[data-id]')),byId={};stories.forEach(function(s){byId[s.getAttribute('data-id')]=s;});
var reduce=window.matchMedia&&matchMedia('(prefers-reduced-motion: reduce)').matches;
var st={segs:null,i:0,mode:'news',only:'',rate:1,playing:false,cur:null,open:false,tok:0},audio=null,bar=null,allBtn=null,pls={};
try{var sm=localStorage.getItem('dd_tts_mode');if(sm==='radio')st.mode='radio';}catch(e){}
// 맨 위 메뉴: 사람 아이콘 왼쪽
var acct=d.querySelector('.dd-nav .dd-r .dd-acct');if(acct){allBtn=d.createElement('button');allBtn.type='button';allBtn.className='dd-tts-all';allBtn.innerHTML=IC.play;allBtn.setAttribute('aria-label','1면 전체 듣기');allBtn.title='1면 전체 듣기';allBtn.setAttribute('aria-pressed','false');acct.parentNode.insertBefore(allBtn,acct);allBtn.addEventListener('click',function(){toggle('');});}
// 기사마다: 공유 아이콘 왼쪽
stories.forEach(function(s){var sh=s.querySelector(':scope>.dd-sh');if(!sh)return;var id=s.getAttribute('data-id');var b=d.createElement('button');b.type='button';b.className='dd-pl'+(sh.classList.contains('dd-bm-inl')?' dd-bm-inl':'');b.innerHTML=IC.play;b.setAttribute('aria-label','이 기사 듣기');b.title='이 기사 듣기';b.setAttribute('aria-pressed','false');sh.insertAdjacentElement('afterend',b);s.classList.add('dd-has-pl');pls[id]=b;
b.addEventListener('keydown',function(e){e.stopPropagation();});b.addEventListener('click',function(e){e.preventDefault();e.stopPropagation();toggle(id);});});
function align(){stories.forEach(function(s){var b=pls[s.getAttribute('data-id')],sh=s.querySelector(':scope>.dd-sh');if(b&&sh)b.style.top=sh.style.top||'';});}
align();addEventListener('resize',function(){requestAnimationFrame(align);});addEventListener('load',function(){requestAnimationFrame(align);});if(d.fonts&&d.fonts.ready)d.fonts.ready.then(function(){requestAnimationFrame(align);});setTimeout(align,300);
function q(p){return '/api/tts/'+p+'?date='+encodeURIComponent(D)+'&mode='+st.mode+(st.only?'&story='+encodeURIComponent(st.only):'');}
function load(){var t=++st.tok;return fetch(q('script.json'),{credentials:'same-origin',cache:'no-store'}).then(function(r){if(!r.ok)throw new Error(r.status);return r.json();}).then(function(j){if(t!==st.tok)throw 0;st.segs=j.segments||[];return st.segs;});}
function toggle(only){if(st.open&&st.only===only){if(st.playing)pause();else play();return;}start(only,0,null);}
function start(only,i,story){st.only=only;st.i=i||0;openBar();status('불러오는 중…');load().then(function(){if(story){for(var k=0;k<st.segs.length;k++)if(st.segs[k].story===story){st.i=k;break;}}if(st.i>=st.segs.length)st.i=0;go();}).catch(function(e){if(e!==0)status('대본을 불러오지 못했습니다');});}
function url(i){return q('audio')+'&i='+i;}
function go(){var s=st.segs&&st.segs[st.i];if(!s){finish();return;}mark(s);if(!audio){audio=new Audio();audio.preload='auto';audio.addEventListener('ended',function(){st.i++;go();});audio.addEventListener('error',function(){if(!st.open)return;status('음성을 만들지 못했습니다 · 다음으로');setTimeout(function(){if(st.open){st.i++;go();}},1200);});audio.addEventListener('playing',function(){status('');});audio.addEventListener('waiting',function(){status('음성 준비 중…');});}
audio.src=url(st.i);audio.playbackRate=st.rate;try{audio.preservesPitch=true;}catch(e){}var p=audio.play();st.playing=true;sync();if(p&&p.catch)p.catch(function(){st.playing=false;sync();});
var n=st.segs[st.i+1];if(n)fetch(url(st.i+1),{credentials:'same-origin'}).catch(function(){});ms(s);}
function play(){if(!audio||!audio.src){go();return;}audio.play();st.playing=true;sync();}
function pause(){if(audio)audio.pause();st.playing=false;sync();}
function finish(){st.playing=false;sync();if(st.only){close();return;}status('다 읽었습니다');}
function storyIdx(dir){if(!st.segs)return;var cur=st.segs[st.i]&&st.segs[st.i].story,ids=[];st.segs.forEach(function(x){if(x.story&&ids.indexOf(x.story)<0)ids.push(x.story);});var k=ids.indexOf(cur);var t=dir>0?(k<0?0:k+1):(k<=0?0:k-1);if(dir<0&&audio&&audio.currentTime>3&&k>=0&&st.segs[st.i].kind!=='title')t=k;if(t>=ids.length){finish();return;}for(var i=0;i<st.segs.length;i++)if(st.segs[i].story===ids[t]&&st.segs[i].kind!=='trans'){st.i=i;break;}go();}
function mark(s){var el=s.story&&byId[s.story];if(st.cur&&st.cur!==el)st.cur.classList.remove('dd-tts-on');if(el){el.classList.add('dd-tts-on');if(st.cur!==el)try{el.scrollIntoView({block:'center',behavior:reduce?'auto':'smooth'});}catch(e){}}st.cur=el||st.cur;
var t=el?(byId[s.story].querySelector('.hl,b')||{}).textContent:'';bar.querySelector('.now').textContent=(t||(s.kind==='open'?'여는 말':s.kind==='close'?'닫는 말':'')).replace(/\\s+/g,' ').trim();}
function sync(){var on=st.playing;if(bar){var pp=bar.querySelector('.pp');pp.innerHTML=on?IC.pause:IC.play;pp.setAttribute('aria-label',on?'멈춤':'재생');}
if(allBtn){var a=st.open&&!st.only&&on;allBtn.innerHTML=a?IC.pause:IC.play;allBtn.setAttribute('aria-pressed',a?'true':'false');allBtn.setAttribute('aria-label',a?'멈춤':'1면 전체 듣기');}
Object.keys(pls).forEach(function(id){var b=pls[id],a=st.open&&on&&(st.only===id||(!st.only&&st.cur===byId[id]));b.innerHTML=a?IC.pause:IC.play;b.setAttribute('aria-pressed',a?'true':'false');b.setAttribute('aria-label',a?'멈춤':'이 기사 듣기');});
try{if(navigator.mediaSession)navigator.mediaSession.playbackState=on?'playing':'paused';}catch(e){}}
function status(t){if(bar)bar.querySelector('.st').textContent=t;}
function ms(s){try{if(!navigator.mediaSession||!window.MediaMetadata)return;navigator.mediaSession.metadata=new MediaMetadata({title:bar.querySelector('.now').textContent||'데일리드롭',artist:'데일리드롭 조간',album:D});['play','pause','previoustrack','nexttrack'].forEach(function(a){navigator.mediaSession.setActionHandler(a,{play:play,pause:pause,previoustrack:function(){storyIdx(-1);},nexttrack:function(){storyIdx(1);}}[a]);});}catch(e){}}
function openBar(){if(bar){st.open=true;return;}st.open=true;bar=d.createElement('div');bar.id='dd-tts';bar.setAttribute('role','region');bar.setAttribute('aria-label','기사 읽어주기');
bar.innerHTML='<div class="in"><div class="r1"><span class="now" aria-live="polite"></span><span class="st" aria-live="polite"></span><button type="button" class="x" aria-label="닫기">닫기</button></div><div class="r2"><button type="button" class="pv" aria-label="이전 기사">'+IC.prev+'</button><button type="button" class="pp" aria-label="재생">'+IC.play+'</button><button type="button" class="nx" aria-label="다음 기사">'+IC.next+'</button><button type="button" class="sp" aria-label="속도">'+(st.rate===1?'1×':'1.25×')+'</button><div class="md" role="group" aria-label="모드"><button type="button" data-m="news" aria-pressed="'+(st.mode==='news')+'">기사만</button><button type="button" data-m="radio" aria-pressed="'+(st.mode==='radio')+'">라디오</button></div></div></div>';
d.body.appendChild(bar);
bar.querySelector('.x').addEventListener('click',close);bar.querySelector('.pp').addEventListener('click',function(){if(st.playing)pause();else play();});bar.querySelector('.pv').addEventListener('click',function(){storyIdx(-1);});bar.querySelector('.nx').addEventListener('click',function(){storyIdx(1);});
bar.querySelector('.sp').addEventListener('click',function(){st.rate=st.rate===1?1.25:1;this.textContent=st.rate===1?'1×':'1.25×';if(audio)audio.playbackRate=st.rate;});
[].forEach.call(bar.querySelectorAll('.md button'),function(b){b.addEventListener('click',function(){var m=b.getAttribute('data-m');if(m===st.mode)return;st.mode=m;try{localStorage.setItem('dd_tts_mode',m);}catch(e){}[].forEach.call(bar.querySelectorAll('.md button'),function(x){x.setAttribute('aria-pressed',String(x.getAttribute('data-m')===m));});var cur=st.segs&&st.segs[st.i]&&st.segs[st.i].story;if(audio)audio.pause();start(st.only,0,cur);});});
st.bodyPad=d.body.style.paddingBottom;pad();addEventListener('resize',pad);}
function pad(){if(!bar)return;d.body.style.paddingBottom=(bar.offsetHeight+12)+'px';}
function close(){st.tok++;st.open=false;st.playing=false;if(audio){audio.pause();audio.removeAttribute('src');try{audio.load();}catch(e){}}audio=null;if(st.cur)st.cur.classList.remove('dd-tts-on');[].forEach.call(d.querySelectorAll('.dd-tts-on'),function(x){x.classList.remove('dd-tts-on');});st.cur=null;st.segs=null;st.only='';
if(bar){bar.remove();bar=null;}removeEventListener('resize',pad);d.body.style.paddingBottom=st.bodyPad||'';try{if(navigator.mediaSession){navigator.mediaSession.metadata=null;navigator.mediaSession.playbackState='none';}}catch(e){}sync();}
window.__ddTtsClose=close;}})();</script>`;

module.exports = { ttsData, ttsScript, CSS, ICON };
