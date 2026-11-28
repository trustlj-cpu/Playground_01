#!/usr/bin/env node
// 판(edition)별 공유 이미지(og:image) 1200x630 PNG 생성 — 그날 머리기사를 신문 1면 모양으로.
// 사용:
//   node og_image.js CODE:DATE[:pm] [...]        editions.json 에 등록된 판의 HTML 에서 머리기사를 읽어 만든다(이미 있으면 --force 가 없을 때 건너뜀)
//   node og_image.js --html PATH --code KR --date 2026-11-27 [--slot pm] [--no 47]   등록 전 HTML 로 직접
//   node og_image.js --backfill 2026-11-20       그 날짜 이후 공개 나라(hidden 제외) 전 판
// 출력: site/og/<prefix의 '/'를 '-'로><dkey>.png  (예: 2026-11-27.png, us-2026-11-27-pm.png)  — build.js 가 같은 규칙으로 찾는다.
// 숨김(hidden) 나라는 만들지 않는다. 실패는 비0 종료(finish.py 는 경고만 하고 /og.png 로 대체).
'use strict';
const fs = require('fs'), path = require('path');
const SITE_DIR = path.resolve(__dirname, '..', '..', 'site');
const OGDIR = path.join(SITE_DIR, 'og');
const COUNTRIES = JSON.parse(fs.readFileSync(path.join(SITE_DIR, 'countries.json'), 'utf8'));
const I18N = JSON.parse(fs.readFileSync(path.join(SITE_DIR, 'i18n.json'), 'utf8'));
const LOGO = 'data:image/svg+xml;base64,' + fs.readFileSync(path.join(SITE_DIR, 'brand', 'logo-ink.svg')).toString('base64');

const ogKey = (prefix, dkey) => String(prefix || '').replace(/\//g, '-') + dkey;
const ent = s => String(s).replace(/&(#x?[0-9a-f]+|amp|lt|gt|quot|apos|nbsp);/gi, (m, g) => {
  const t = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ' }[g.toLowerCase()]; if (t) return t;
  const n = g[1] === 'x' || g[1] === 'X' ? parseInt(g.slice(2), 16) : parseInt(g.slice(1), 10); return isNaN(n) ? m : String.fromCodePoint(n);
});
// build.js 의 LEADT 와 같은 규칙: 첫 .story 의 팝업 제목
function leadTitle(html) {
  const m = html.match(/const A = (\{[\s\S]*?\n  \});\n/); if (!m) return '';
  let A; try { A = new Function('return ' + m[1])(); } catch (_) { return ''; }
  const id = (html.match(/class="story[^"]*"[^>]*data-id="([\w-]+)"/) || html.match(/data-id="([\w-]+)"/) || [])[1];
  const t = id && A[id] && String(A[id].title || '');
  return ent((t || '').replace(/<[^>]+>/g, '')).replace(/\s+/g, ' ').trim();
}
const L = (lang, k) => ((I18N[lang] || {})[k]) || (I18N.en || {})[k] || '';
function labels(lang, date, slot, no) {
  const d = new Date(date + 'T00:00:00Z');
  let ds; try { ds = new Intl.DateTimeFormat(lang, { dateStyle: 'full', timeZone: 'UTC' }).format(d); } catch (_) { ds = date; }
  const ed = L(lang, slot ? 'editionPM' : 'editionAM').replace('{n}', no || '');
  return { date: ds, ed };
}
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

function pageHtml({ lang, title, date, ed }) {
  const cjk = /^(ko|ja|zh)/.test(lang);
  const fam = lang === 'ja' ? '"Noto Serif JP","Noto Serif KR"' : lang === 'ko' ? '"Noto Serif KR","Noto Serif JP"' : '"Noto Serif","Noto Serif KR","Noto Serif JP"';
  const gf = 'https://fonts.googleapis.com/css2?family=Noto+Serif+KR:wght@600;900&family=Noto+Serif+JP:wght@600;900&family=Noto+Serif:wght@600;700&family=Noto+Sans+KR:wght@500;700&display=swap';
  return `<!doctype html><html lang="${lang}"><head><meta charset="utf-8"><link rel="stylesheet" href="${gf}"><style>
*{box-sizing:border-box;margin:0;padding:0}
html,body{width:1200px;height:630px;background:#ece4d8;overflow:hidden}
body{position:relative;color:#121212;font-family:${fam},"WenQuanYi Zen Hei",IPAGothic,Georgia,serif}
.frame{position:absolute;left:28px;top:28px;right:28px;bottom:28px;border:3px solid #121212}
.frame:after{content:"";position:absolute;left:6px;top:6px;right:6px;bottom:6px;border:1px solid #121212}
.in{position:absolute;left:62px;right:62px;top:50px;bottom:46px;display:flex;flex-direction:column}
.logo{display:block;height:64px;margin:0 auto}
.dl{display:flex;justify-content:space-between;align-items:center;margin-top:16px;padding:9px 2px;border-top:3px double #121212;border-bottom:1px solid #121212;font:700 22px/1.2 "Noto Sans KR","Noto Serif",${fam},sans-serif;letter-spacing:.02em}
.dl i{font-style:normal;color:#8d2f22}
.hw{flex:1;display:flex;align-items:center}
h1{width:100%;font-weight:900;line-height:${cjk ? 1.28 : 1.18};letter-spacing:${cjk ? '-.01em' : '-.012em'};${cjk ? 'word-break:keep-all;' : 'text-wrap:balance;hyphens:auto;'}overflow-wrap:anywhere;padding-bottom:.14em;display:-webkit-box;-webkit-box-orient:vertical;-webkit-line-clamp:3;overflow:hidden}
.ft{border-top:1px solid #121212;padding-top:11px;text-align:center;font:600 21px/1 "Noto Sans KR","Noto Serif",sans-serif;letter-spacing:.06em;color:#3d3a33}
</style></head><body><div class="frame"></div><div class="in">
<img class="logo" src="${LOGO}" alt="DailyDrop">
<div class="dl"><span>${esc(date)}</span><i>${esc(ed)}</i></div>
<div class="hw"><h1 id="h">${esc(title)}</h1></div>
<div class="ft">dailydropnewspaper.com</div></div></body></html>`;
}
// 글자 크기: 3줄 안에 들어가는 가장 큰 크기(72→46), 그래도 넘으면 3줄에서 말줄임
const FIT = () => {
  const h = document.getElementById('h'); const box = h.parentElement;
  const lines = () => Math.round(h.scrollHeight / parseFloat(getComputedStyle(h).lineHeight));
  let s = 74; h.style.fontSize = s + 'px';
  while (s > 46) { h.style.webkitLineClamp = 'unset'; h.style.maxHeight = 'none'; h.style.fontSize = s + 'px'; if (lines() <= 3 && h.scrollHeight <= box.clientHeight) break; s -= 2; }
  h.style.fontSize = s + 'px'; h.style.webkitLineClamp = '3'; return s;
};

async function render(browser, job) {
  const { lang, title, date, ed, out } = job;
  const ctx = await browser.newContext({ viewport: { width: 1200, height: 630 }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  let fontsOk = true; page.on('requestfailed', r => { if (/fonts\.(googleapis|gstatic)\.com/.test(r.url())) fontsOk = false; });
  try {
    await page.setContent(pageHtml({ lang, title, date, ed }), { waitUntil: 'networkidle', timeout: 30000 }).catch(() => { fontsOk = false; });
    await page.evaluate(() => document.fonts.ready);
    await page.evaluate(FIT);
    fs.mkdirSync(path.dirname(out), { recursive: true });
    await page.screenshot({ path: out, type: 'png', clip: { x: 0, y: 0, width: 1200, height: 630 } });
  } finally { await ctx.close(); }
  const kb = fs.statSync(out).size / 1024;
  if (kb > 300) throw new Error(`${path.basename(out)} ${kb.toFixed(0)}KB > 300KB`);
  return { kb, fontsOk };
}

function jobFromHtml({ code, date, slot, no, htmlPath }) {
  const c = COUNTRIES.find(x => x.code === code);
  if (!c) throw new Error('unknown country ' + code);
  if (c.hidden) return null;
  const title = leadTitle(fs.readFileSync(htmlPath, 'utf8'));
  if (!title) throw new Error('no lead headline in ' + htmlPath);
  const lang = c.langs[0]; const dkey = date + (slot ? '-pm' : '');
  const { date: ds, ed } = labels(lang, date, slot, no);
  const key = ogKey(c.prefix, dkey);
  return { key, lang, title, date: ds, ed, out: path.join(OGDIR, key + '.png') };
}

async function main() {
  const argv = process.argv.slice(2); const force = argv.includes('--force');
  const opt = k => { const i = argv.indexOf(k); return i >= 0 ? argv[i + 1] : null; };
  const jobs = [];
  const editions = JSON.parse(fs.readFileSync(path.join(SITE_DIR, 'editions.json'), 'utf8'));
  const fromEd = e => jobFromHtml({ code: e.region || 'KR', date: e.date, slot: e.slot === 'pm' ? 'pm' : '', no: e.no, htmlPath: path.join(SITE_DIR, e.file) });
  if (opt('--html')) {
    const j = jobFromHtml({ code: opt('--code'), date: opt('--date'), slot: opt('--slot') || '', no: opt('--no'), htmlPath: opt('--html') }); if (j) jobs.push(j);
  } else if (opt('--backfill')) {
    const from = opt('--backfill'); const only = (opt('--only') || '').split(',').filter(Boolean);
    for (const e of editions) { if (e.date < from) continue; if (only.length && !only.includes(e.region || 'KR')) continue; const j = fromEd(e); if (j) jobs.push(j); }
  } else {
    for (const a of argv.filter(x => !x.startsWith('--'))) {
      const [code, date, slot] = a.split(':'); const e = editions.find(x => (x.region || 'KR') === code && x.date === date && (x.slot === 'pm' ? 'pm' : '') === (slot || ''));
      if (!e) throw new Error('not in editions.json: ' + a); const j = fromEd(e); if (j) jobs.push(j);
    }
  }
  const todo = jobs.filter(j => force || !fs.existsSync(j.out));
  if (!todo.length) { console.log('og_image: nothing to do (' + jobs.length + ' up to date or hidden)'); return; }
  const { chromium } = require('playwright');
  const browser = await chromium.launch(); let bad = 0;
  try {
    for (const j of todo) {
      try { const r = await render(browser, j); console.log('og_image: ' + j.key + '.png ' + r.kb.toFixed(0) + 'KB' + (r.fontsOk ? '' : ' (WARN web fonts unavailable: fallback fonts used)') + '  ' + j.title.slice(0, 40)); }
      catch (e) { bad++; console.error('og_image FAIL ' + j.key + ': ' + e.message); }
    }
  } finally { await browser.close(); }
  if (bad) process.exit(1);
}
main().catch(e => { console.error('og_image FAIL: ' + e.message); process.exit(1); });
