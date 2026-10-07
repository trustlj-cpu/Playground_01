// 데일리드롭 웹사이트 빌더: 호(edition) HTML 2개 → public/ (최신호·보관함·용어사전·소개·구독)
// 사용: node site/build.js <editions.json>   editions.json = [{date:"2026-10-05", no:1, file:"/path/index.html"}, ...]
const fs = require('fs'), path = require('path');
const [, , spec] = process.argv;
const editions = JSON.parse(fs.readFileSync(spec, 'utf8')).map(e => ({ ...e, file: path.resolve(path.dirname(spec), e.file) })).sort((a, b) => a.date.localeCompare(b.date));
const OUT = path.join(__dirname, 'public'); fs.rmSync(OUT, { recursive: true, force: true }); fs.mkdirSync(OUT, { recursive: true });
const SITE = 'https://dailydrop.kr';
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const KO_DAY = ['일', '월', '화', '수', '목', '금', '토'];
const fmt = d => { const [y, m, dd] = d.split('-').map(Number); return `${y}년 ${m}월 ${dd}일 ${KO_DAY[new Date(Date.UTC(y, m - 1, dd)).getUTCDay()]}요일`; };
const NAV = (active) => `<nav class="dd-nav" aria-label="데일리드롭"><a href="/" class="dd-logo">데일리드롭<i>.</i></a><div class="dd-links">${[['/', '최신호'], ['/archive/', '지난 호'], ['/glossary/', '용어사전'], ['/about/', '소개'], ['/subscribe/', '구독']].map(([h, t]) => `<a href="${h}"${h === active ? ' aria-current="page"' : ''}>${t}</a>`).join('')}</div></nav>`;
const NAVCSS = `<style>.dd-nav{position:sticky;top:0;z-index:50;display:flex;justify-content:space-between;align-items:center;gap:12px;padding:8px 16px;background:var(--paper,#f3eee2);border-bottom:1px solid var(--rule,#b9b1a0);font-family:"Noto Sans KR",sans-serif;font-size:13px}.dd-logo{font-family:"Noto Serif KR",serif;font-weight:900;font-size:18px;letter-spacing:-.04em;color:inherit;text-decoration:none}.dd-logo i{font-style:normal;color:var(--red,#8d2f22)}.dd-links{display:flex;gap:14px;flex-wrap:wrap}.dd-links a{color:inherit;text-decoration:none;letter-spacing:.04em}.dd-links a[aria-current]{border-bottom:2px solid var(--red,#8d2f22)}@media(max-width:480px){.dd-links{gap:10px;font-size:12px}}</style>`;
const HEAD = (title, desc, pathname = '/') => `<!doctype html><html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><title>${esc(title)}</title><meta name="description" content="${esc(desc)}"><link rel="canonical" href="${SITE}${pathname}"><meta property="og:url" content="${SITE}${pathname}"><meta property="og:type" content="article"><meta property="og:title" content="${esc(title)}"><meta property="og:description" content="${esc(desc)}"><meta property="og:site_name" content="데일리드롭"><meta property="og:image" content="${SITE}/og.png"><meta name="twitter:card" content="summary_large_image"><link rel="icon" href="/favicon.svg" type="image/svg+xml"><link rel="manifest" href="/manifest.webmanifest"><meta name="theme-color" content="#f3eee2">${NAVCSS}</head><body>`;
const BASECSS = `<style>:root{--paper:#f3eee2;--ink:#1b1a17;--ink-2:#3d3a33;--mute:#7b7569;--rule:#b9b1a0;--red:#8d2f22}@media(prefers-color-scheme:dark){:root{--paper:#1d1b17;--ink:#ece6d8;--ink-2:#cfc8b8;--mute:#8e877a;--rule:#4a443a;--red:#d2654f}}body{margin:0;background:var(--paper);color:var(--ink);font-family:"Noto Serif KR",Georgia,serif;line-height:1.65}main{max-width:760px;margin:0 auto;padding:28px 16px 60px}h1{font-size:30px;font-weight:900;letter-spacing:-.03em;line-height:1.25;margin:0 0 6px}h2{font-size:18px;margin:34px 0 10px;border-bottom:1px solid var(--rule);padding-bottom:6px}p{margin:0 0 14px}.mute{color:var(--mute);font-family:"Noto Sans KR",sans-serif;font-size:13px}.card{display:block;color:inherit;text-decoration:none;border:1px solid var(--rule);padding:16px 18px;margin:14px 0;background:rgba(0,0,0,.02)}.card b{font-size:19px;display:block;margin-bottom:4px}.card:hover{border-color:var(--red)}.btn{display:inline-block;background:var(--red);color:#fff;text-decoration:none;padding:12px 20px;font-family:"Noto Sans KR",sans-serif;font-weight:700;letter-spacing:.04em;margin-top:8px}.term{border-bottom:1px solid var(--rule);padding:14px 0}.term h3{margin:0 0 4px;font-size:17px}.term .f{color:var(--red);font-family:"Noto Sans KR",sans-serif;font-size:11.5px;letter-spacing:.14em;margin-left:8px}.term .w{color:var(--ink-2);font-size:14.5px;margin-top:6px}.term .src{color:var(--mute);font-family:"Noto Sans KR",sans-serif;font-size:12px;margin-top:4px}input[type=search]{width:100%;box-sizing:border-box;font:16px "Noto Sans KR",sans-serif;padding:10px 12px;border:1px solid var(--rule);background:transparent;color:inherit;margin:8px 0 10px}</style>`;
const FONTS = `<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Noto+Serif+KR:wght@300;400;600;700;900&family=Noto+Sans+KR:wght@400;500;700&display=swap">`;

// ── 호 페이지: 원본 HTML을 그대로 쓰되 문서 뼈대 + 상단 nav
const glossary = {}; // term → {f,d,w,first:date,no}
for (const e of editions) {
  let html = fs.readFileSync(e.file, 'utf8');
  const m = html.match(/const G = (\{[\s\S]*?\n  \});\n/); if (m) { const G = new Function('return ' + m[1])(); for (const [k, v] of Object.entries(G)) if (!glossary[k]) glossary[k] = { ...v, first: e.date, no: e.no }; }
  const title = `데일리드롭 제${e.no}호 · ${fmt(e.date)} 저녁판`;
  const page = HEAD(title, '국내외 전 분야 이슈를 매일 한 장에. 기사를 누르면 펼쳐지고 점선 단어를 누르면 뜻이 뜹니다.', `/${e.date}/`) + NAV('/') + html.replace(/^<title>.*?<\/title>\s*/s, '') + '</body></html>';
  const dir = path.join(OUT, e.date); fs.mkdirSync(dir, { recursive: true }); fs.writeFileSync(path.join(dir, 'index.html'), page);
}
const latest = editions[editions.length - 1];
fs.writeFileSync(path.join(OUT, 'index.html'), fs.readFileSync(path.join(OUT, latest.date, 'index.html'), 'utf8').replace(`${SITE}/${latest.date}/`, `${SITE}/`));

// ── 보관함
fs.mkdirSync(path.join(OUT, 'archive'));
fs.writeFileSync(path.join(OUT, 'archive', 'index.html'), HEAD('데일리드롭 지난 호', '데일리드롭 모든 호 보관함', '/archive/') + FONTS + BASECSS + NAV('/archive/') + `<main><h1>지난 호</h1><p class="mute">매일 저녁 한 장. 최신호가 맨 위.</p>${[...editions].reverse().map(e => `<a class="card" href="/${e.date}/"><b>제 ${e.no} 호 · ${fmt(e.date)} 저녁판</b><span class="mute">${esc(e.blurb || '')}</span></a>`).join('')}</main></body></html>`);

// ── 용어사전 (검색)
const terms = Object.entries(glossary).sort((a, b) => a[0].localeCompare(b[0], 'ko'));
fs.mkdirSync(path.join(OUT, 'glossary'));
fs.writeFileSync(path.join(OUT, 'glossary', 'index.html'), HEAD('데일리드롭 용어사전', `기사 맥락과 함께 설명하는 용어 ${terms.length}개. 매일 쌓입니다.`, '/glossary/') + FONTS + BASECSS + NAV('/glossary/') + `<main><h1>용어사전</h1><p class="mute">기사에서 점선 밑줄로 만난 단어 ${terms.length}개. 뜻 + 그 기사에서 왜 중요했는지. 매일 쌓입니다.</p><input type="search" id="q" placeholder="단어·분야 검색 (예: 금리, 안보)" aria-label="용어 검색"><div id="list">${terms.map(([k, v]) => `<div class="term" data-k="${esc((k + ' ' + v.f + ' ' + v.d).toLowerCase())}"><h3>${esc(k)}<span class="f">${esc(v.f)}</span></h3><div>${esc(v.d)}</div><div class="w"><b>이 기사에서는</b> ${esc(v.w)}</div><div class="src">첫 등장 · 제${v.no}호 (${v.first})</div></div>`).join('')}</div><p class="mute" id="none" hidden>검색 결과가 없습니다.</p></main><script>const q=document.getElementById('q'),rows=[...document.querySelectorAll('.term')],none=document.getElementById('none');q.addEventListener('input',()=>{const s=q.value.trim().toLowerCase();let n=0;rows.forEach(r=>{const ok=!s||r.dataset.k.includes(s);r.hidden=!ok;if(ok)n++});none.hidden=n>0;});</script></body></html>`);

// ── 소개 · 구독
fs.mkdirSync(path.join(OUT, 'about')); fs.mkdirSync(path.join(OUT, 'subscribe')); fs.mkdirSync(path.join(OUT, 'privacy'));
fs.writeFileSync(path.join(OUT, 'about', 'index.html'), HEAD('데일리드롭 소개', '매일 저녁, 국내외 전 분야 이슈를 신문 1면 한 장으로.', '/about/') + FONTS + BASECSS + NAV('/about/') + `<main><h1>데일리드롭<i style="font-style:normal;color:var(--red)">.</i></h1><p class="mute">DAILY DROP · 국내외 전 분야 · 매일 한 장</p>
<p>뉴스는 많은데 남는 게 없다는 느낌으로 시작했습니다. 하루치 이슈를 신문 1면 한 장에 올리고, 궁금한 기사만 눌러서 펼쳐 읽게 만들었습니다. 펼치면 "무슨 일 / 왜 중요한가 / 나에게는 / 두 가지 시선 / 데일리드롭 생각 / 출처" 순서로 7분이면 끝납니다.</p>
<h2>세 가지 약속</h2>
<p><b>출처를 숨기지 않습니다.</b> 기사마다 어디서 확인했는지 적습니다. "원자료 ✓"는 발표 기관 원문을 봤다는 뜻, "보도 대조 ✓"는 서로 다른 매체 두 곳 이상이 일치한다는 뜻입니다. 확인 못 한 건 "소문의 온도"에 따로 둡니다.</p>
<p><b>양쪽을 적습니다.</b> 모든 기사에 '이렇게 보는 쪽'과 '저렇게 보는 쪽'이 있습니다. 결론은 '데일리드롭 생각'에 따로 적어 의견과 사실을 섞지 않습니다.</p>
<p><b>모르는 단어는 누르면 뜹니다.</b> 점선 밑줄 단어를 누르면 뜻과 "이 기사에서 왜 중요한지"가 함께 나옵니다. 용어는 매일 쌓여 <a href="/glossary/">용어사전</a>이 됩니다.</p>
<h2>발행</h2><p>매일 저녁 발행(저녁판). 주말은 짧게. 본문을 옮기지 않고 요약과 출처만 싣습니다.</p>
<p><a class="btn" href="/subscribe/">구독 안내 →</a> <a class="btn" href="/privacy/">개인정보처리방침 →</a></p></main></body></html>`);
fs.writeFileSync(path.join(OUT, 'subscribe', 'index.html'), HEAD('데일리드롭 구독', '네이버 프리미엄콘텐츠에서 구독할 수 있습니다.', '/subscribe/') + FONTS + BASECSS + NAV('/subscribe/') + `<main><h1>구독</h1>
<p>데일리드롭은 <b>네이버 프리미엄콘텐츠</b>에서 구독합니다. 채널 심사가 끝나는 대로 이 자리에 구독 버튼이 생깁니다.</p>
<p class="mute">현재 상태: 채널 심사 중 (2026년 10월 13일 전후 결과 예정). 그 전까지는 이 사이트에서 1·2호를 무료로 읽을 수 있습니다.</p>
<h2>구독하면</h2><p>매일 저녁 1면 전체와 펼침 기사 전문, '데일리드롭 생각', 용어사전 누적분을 봅니다. 첫 달은 100원으로 시작할 계획입니다.</p>
<p><a class="btn" href="/">오늘 1면 읽기 →</a></p></main></body></html>`);

// ── 공통 자산
fs.writeFileSync(path.join(OUT, 'favicon.svg'), `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" fill="#f3eee2"/><text x="50%" y="56%" text-anchor="middle" dominant-baseline="middle" font-family="serif" font-weight="900" font-size="40" fill="#1b1a17">드</text><circle cx="52" cy="50" r="5" fill="#8d2f22"/></svg>`);
fs.writeFileSync(path.join(OUT, 'manifest.webmanifest'), JSON.stringify({ name: '데일리드롭', short_name: '데일리드롭', start_url: '/', display: 'standalone', background_color: '#f3eee2', theme_color: '#f3eee2', icons: [{ src: '/icon-512.svg', sizes: '512x512', type: 'image/svg+xml', purpose: 'any' }] }));
fs.writeFileSync(path.join(OUT, 'icon-512.svg'), `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><rect width="512" height="512" fill="#f3eee2"/><text x="50%" y="55%" text-anchor="middle" dominant-baseline="middle" font-family="serif" font-weight="900" font-size="300" fill="#1b1a17">드</text><circle cx="410" cy="400" r="36" fill="#8d2f22"/></svg>`);
fs.writeFileSync(path.join(OUT, '404.html'), HEAD('데일리드롭 — 없는 페이지', '') + FONTS + BASECSS + NAV('') + `<main><h1>이 면은 없습니다</h1><p><a class="btn" href="/">오늘 1면으로 →</a></p></main></body></html>`);
fs.copyFileSync(path.join(__dirname, 'og.png'), path.join(OUT, 'og.png'));
fs.writeFileSync(path.join(OUT, 'robots.txt'), `User-agent: *\nAllow: /\nSitemap: ${SITE}/sitemap.xml\n`);
// 개인정보처리방침: 앱스토어/플레이스토어 제출 요건(공개 URL). 계정·가입 없음, 수집 최소.
fs.writeFileSync(path.join(OUT, 'privacy', 'index.html'), HEAD('데일리드롭 개인정보처리방침', '데일리드롭 웹·앱의 개인정보 처리 원칙.', '/privacy/') + FONTS + BASECSS + NAV('/about/') + `<main><h1>개인정보처리방침</h1><p class="mute">시행일 2026년 10월 7일 · 적용 범위: dailydrop.kr 웹사이트와 데일리드롭 iOS·Android 앱</p>
<h2>1. 수집하는 정보</h2>
<p>데일리드롭은 회원가입·로그인이 없으며 이름, 이메일, 전화번호 같은 개인정보를 요구하지 않습니다. 서비스 제공을 위해 다음 정보만 처리합니다.</p>
<ul><li><b>접속 기록</b> — 호스팅(Cloudflare)이 보안·오류 대응을 위해 IP 주소, 접속 시각, 브라우저 종류를 짧은 기간 기록합니다. 이 기록은 개인을 식별하는 데 쓰지 않습니다.</li>
<li><b>기기 내 저장</b> — 앱과 웹의 '보관', 읽은 호, 테마 설정은 사용자의 기기(브라우저 저장소)에만 저장되며 서버로 전송되지 않습니다. 앱 삭제·브라우저 데이터 삭제로 지워집니다.</li>
<li><b>알림(선택)</b> — 저녁판 발행 알림을 켜면 알림 전송용 기기 토큰이 서버에 저장됩니다. 토큰은 알림 전송에만 쓰이고, 알림을 끄면 삭제됩니다.</li></ul>
<h2>2. 이용 목적</h2><p>뉴스 요약 제공, 발행 알림, 서비스 안정성 확인. 광고 식별자·행태 추적·제3자 분석 도구는 사용하지 않습니다.</p>
<h2>3. 제3자 제공·국외 이전</h2><p>개인정보를 판매하거나 제3자에게 제공하지 않습니다. 호스팅 사업자 Cloudflare, Inc.(미국)의 서버를 이용하므로 접속 기록이 국외에서 처리될 수 있습니다.</p>
<h2>4. 보유 기간</h2><p>접속 기록은 호스팅 사업자의 보존 기간(통상 수일~수주)이 지나면 삭제됩니다. 알림 토큰은 알림 해제 또는 앱 삭제 시 삭제됩니다.</p>
<h2>5. 이용자의 권리</h2><p>알림은 기기 설정이나 앱 안에서 언제든 끌 수 있습니다. 기기 내 저장 데이터는 이용자가 직접 삭제할 수 있습니다. 그 밖의 문의는 아래 연락처로 보내 주세요.</p>
<h2>6. 아동</h2><p>데일리드롭은 만 14세 미만 아동의 개인정보를 의도적으로 수집하지 않습니다.</p>
<h2>7. 외부 링크</h2><p>기사 출처 링크는 각 언론사·기관의 사이트로 연결되며, 해당 사이트의 개인정보 처리는 그 운영자의 방침을 따릅니다.</p>
<h2>8. 문의 및 변경</h2><p>문의 연락처는 운영자 확인 후 이 페이지에 게시합니다. 방침이 바뀌면 이 페이지의 시행일을 갱신해 알립니다.</p>
<p><a class="btn" href="/about/">소개로 돌아가기 →</a></p></main></body></html>`);
fs.writeFileSync(path.join(OUT, 'sitemap.xml'), `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${['/', '/archive/', '/glossary/', '/about/', '/subscribe/', '/privacy/', ...editions.map(e => `/${e.date}/`)].map(u => `<url><loc>${SITE}${u}</loc></url>`).join('')}</urlset>`);
// www → 루트, 그리고 임시 workers.dev → dailydrop.kr 리다이렉트(Cloudflare _redirects)
// 호스트 리다이렉트(www·workers.dev → dailydrop.kr)는 src/index.js 에서 처리(_redirects 는 상대 경로만 허용)
console.log('built', fs.readdirSync(OUT).join(' '), '| terms', terms.length);
