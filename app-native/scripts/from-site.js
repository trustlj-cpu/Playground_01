#!/usr/bin/env node
// Dev helper: derive app data from the website source (read-only).
//
//   node scripts/from-site.js i18n <site-src>                 → src/i18n/site.json (popup labels, UI strings)
//   node scripts/from-site.js fixtures <site-src> <built-site> → fixtures/app/v1/** + fixtures/index.ts
//
// When <built-site>/app/v1/index.json exists (site/build.js emits the API since 859e6a5), the fixtures are a
// trimmed copy of that real output. Otherwise they are synthesised from the built HTML pages (legacy path).
//
// <site-src>   = the repo's site/ directory (editions.json, i18n.json, countries.json, build.js, extras/)
// <built-site> = output of `node site/build.js site/editions.json <dir>` (used for the final datelines)
//
// The fixtures mimic the static JSON API (ops/app/API.md) until /app/v1/ is live.
// Once site/build.js emits app/v1 itself, copy that output into fixtures/app/v1 instead.
const fs = require('fs');
const path = require('path');

const [, , cmd, SRC, BUILT] = process.argv;
if (!cmd || !SRC) {
  console.error('usage: from-site.js i18n <site-src> | fixtures <site-src> <built-site>');
  process.exit(1);
}
const ROOT = path.resolve(__dirname, '..');
const readJSON = (f) => JSON.parse(fs.readFileSync(f, 'utf8'));
const COUNTRIES = readJSON(path.join(SRC, 'countries.json'));
const CBY = Object.fromEntries(COUNTRIES.map((c) => [c.code, c]));
const I18N = readJSON(path.join(SRC, 'i18n.json'));
const EDITIONS = readJSON(path.join(SRC, 'editions.json'));
const BUILD_JS = fs.readFileSync(path.join(SRC, 'build.js'), 'utf8');

const decode = (s) =>
  String(s)
    .replace(/&nbsp;/g, ' ')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, '&');
const text = (h) => decode(String(h).replace(/<br\s*\/?>/gi, '\n').replace(/<[^>]+>/g, '')).replace(/[ \t]+/g, ' ').trim();
const constObj = (name) => {
  const m = BUILD_JS.match(new RegExp('const ' + name + ' = (\\{[^\\n]*?\\});'));
  return m ? new Function('return ' + m[1])() : {};
};

// ── popup labels per region:lang, read from the edition templates
function popupLabels() {
  const out = {};
  for (const e of EDITIONS) {
    const region = e.region || 'KR';
    const files = [[CBY[region].langs[0], e.file], ...Object.entries(e.translations || {})];
    for (const [lang, file] of files) {
      let h;
      try { h = fs.readFileSync(path.join(SRC, file), 'utf8'); } catch (_) { continue; }
      const m = h.match(/body\.innerHTML=`([\s\S]*?)`;/);
      if (!m) continue;
      const labs = [...m[1].matchAll(/class="lab">([^<]*)/g)].map((x) => x[1]);
      const views = [...m[1].matchAll(/<p><b>([^<]*)<\/b>/g)].map((x) => x[1]);
      const src = (m[1].match(/class="src">([^$]*?)\s*·\s*\$/) || [])[1];
      const here = ((h.match(/class="tw"><b>([^<]*)<\/b>/) || [])[1] || '').replace(/[「」]/g, '');
      if (labs.length < 5) continue;
      const L = { what: labs[0], why: labs[1], me: labs[2], two: labs[3], say: labs[4], a: views[0] || '', b: views[1] || '', src: src || '', here };
      out[region + ':' + lang] = L; // newest edition wins (editions.json is chronological)
      if (!out[lang] || CBY[region].langs[0] === lang) out[lang] = L;
    }
  }
  return out;
}

function i18n() {
  const pick = (o, keys) => Object.fromEntries(keys.filter((k) => o && o[k] != null).map((k) => [k, o[k]]));
  const ui = {};
  for (const [l, d] of Object.entries(I18N)) {
    ui[l] = {
      ...pick(d, ['latest', 'archive', 'glossary', 'about', 'settings', 'langname', 'langcode', 'editionShort']),
      account: pick(d.account, ['tabArticles', 'tabTerms', 'emptyArticles', 'emptyTerms', 'bm', 'bmOn', 'remove', 'loading']),
      glossaryPage: pick(d.glossaryPage, ['search', 'here', 'first', 'none', 'intro']),
      settingsPage: pick(d.settingsPage, ['title', 'h', 'p', 'hm', 'pm', 'modes', 'hs', 'ps', 'preview', 'reset', 'h2', 'cur', 'search', 'glyph']),
    };
  }
  const out = { popup: popupLabels(), ui, breaking: constObj('BRK_L'), infl: constObj('XL') };
  const f = path.join(ROOT, 'src/i18n/site.json');
  fs.mkdirSync(path.dirname(f), { recursive: true });
  fs.writeFileSync(f, JSON.stringify(out, null, 1) + '\n');
  console.log('wrote', path.relative(ROOT, f), Object.keys(out.popup).length, 'label sets');
}

// ── balanced element grab: returns [outerHTML, innerHTML, endIndex] for the element starting at i
function grab(html, i) {
  const tag = html.slice(i + 1).match(/^[a-z0-9]+/i)[0];
  const re = new RegExp('<(/?)' + tag + '\\b[^>]*>', 'gi');
  re.lastIndex = i;
  let depth = 0, m, openEnd = -1;
  while ((m = re.exec(html))) {
    if (m[1]) depth--; else { depth++; if (openEnd < 0) openEnd = re.lastIndex; }
    if (depth === 0) return [html.slice(i, re.lastIndex), html.slice(openEnd, m.index), re.lastIndex];
  }
  return [html.slice(i), html.slice(openEnd), html.length];
}
const ALLOWED = new Set(['b', 'i', 'em', 'strong', 'a', 'br', 'p', 'ul', 'ol', 'li', 'span', 'small', 'table', 'tr', 'td', 'th']);
function sanitize(h) {
  return h
    .replace(/<(\/?)div\b[^>]*>/gi, '<$1p>')
    .replace(/<(\/?)([a-z0-9]+)\b([^>]*)>/gi, (all, close, tag, attrs) => {
      tag = tag.toLowerCase();
      if (!ALLOWED.has(tag)) return '';
      if (tag === 'a' && !close) {
        const href = (attrs.match(/href="(https?:[^"]+)"/) || [])[1];
        return href ? `<a href="${href}">` : '<a>';
      }
      return `<${close}${tag}>`;
    })
    .replace(/<p>\s*<\/p>/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

const LOCAL2UTC = (date, hm, tz) => {
  const [y, mo, d] = date.split('-').map(Number), [h, mi] = hm.split(':').map(Number);
  const g = Date.UTC(y, mo - 1, d, h, mi);
  const p = Object.fromEntries(new Intl.DateTimeFormat('en-US', { timeZone: tz, hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }).formatToParts(new Date(g)).map((x) => [x.type, x.value]));
  const shown = Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour % 24, +p.minute);
  return new Date(g - (shown - g)).toISOString();
};

function edition(e, lang, builtFile) {
  const region = e.region || 'KR', C = CBY[region], native = C.langs[0] === lang;
  const h = fs.readFileSync(builtFile, 'utf8');
  const A = new Function('return ' + h.match(/const A = (\{[\s\S]*?\n  \});\n/)[1])();
  const G = new Function('return ' + h.match(/const G = (\{[\s\S]*?\n  \});\n/)[1])();
  const dl = h.match(/<div class="dateline">([\s\S]*?)<\/div>/)[1];
  const label = text((dl.match(/class="eno">([\s\S]*?)<\/small>/) || [])[1] || '');
  const place = text((dl.match(/<summary[^>]*>([\s\S]*?)<\/summary>/) || [])[1] || '').replace(/^▼\s*/, '');
  const rest = text((dl.match(/<\/details>([\s\S]*?)<\/b>/) || [])[1] || '');
  const time = text((dl.match(/class="eds">([\s\S]*?)<\/small>/) || [])[1] || '');
  const ears = [...h.matchAll(/<div class="ear( r)?">([\s\S]*?)<\/div>/g)].map((m) => text(m[2].replace(/<\/b>/, '</b> ')));
  const house = text((h.match(/<div class="house">([\s\S]*?)<\/div>/) || [])[1] || '');

  // stories in page order
  const stories = [];
  const re = /<(article|div) class="([^"]*\bstory\b[^"]*)"[^>]*data-id="([^"]+)"/g;
  let m;
  while ((m = re.exec(h))) {
    const [outer, inner] = grab(h, m.index);
    const id = m[3], isIndex = /\bit\b/.test(m[2]);
    const a = A[id] || {};
    let kick, hl, dek, body;
    if (isIndex) {
      kick = text((inner.match(/<span[^>]*>([\s\S]*?)<\/span>\s*$/) || [])[1] || '');
      hl = text((inner.match(/<b>([\s\S]*?)<\/b>/) || [])[1] || '');
      dek = text((inner.match(/<em>([\s\S]*?)<\/em>/) || [])[1] || '');
      const full = inner.match(/<div class="dd-full"[^>]*>([\s\S]*?)<\/div>/);
      body = full ? [...full[1].matchAll(/<p>([\s\S]*?)<\/p>/g)].map((x) => text(x[1])) : [];
    } else {
      const k = inner.match(/<div class="kick">([\s\S]*?)<span>([\s\S]*?)<\/span>/);
      kick = k ? text(k[1]) + ' · ' + text(k[2]) : text((inner.match(/<div class="kick">([\s\S]*?)<\/div>/) || [])[1] || '');
      hl = text((inner.match(/<h[23] class="hl">([\s\S]*?)<\/h[23]>/) || [])[1] || '');
      dek = text((inner.match(/<p class="deck">([\s\S]*?)<\/p>/) || [])[1] || '');
      const b = inner.match(/<div class="(?:body|one)">([\s\S]*?)<\/div>/);
      body = b ? [...b[1].matchAll(/<p>([\s\S]*?)<\/p>/g)].map((x) => text(x[1])) : [];
    }
    const popup = Object.fromEntries(['kick', 'title', 'what', 'why', 'me', 'a', 'b', 'say', 'src'].map((k) => [k, text(a[k] || '')]));
    stories.push({ id, rank: stories.length, kick, hl, dek, body, popup });
    re.lastIndex = m.index + outer.length;
  }

  // blocks
  const blocks = [];
  const blockRe = /<(div|footer) class="(fill(?: word)?|rumor|next|glos|colophon)"/g;
  while ((m = blockRe.exec(h))) {
    const [outer, inner0] = grab(h, m.index);
    let inner = inner0, type = m[2];
    const title = text((inner.match(/<h[45]>([\s\S]*?)<\/h[45]>/) || [])[1] || '');
    inner = inner.replace(/<h[45]>[\s\S]*?<\/h[45]>/, '');
    if (type.startsWith('fill')) type = /class="nums"/.test(inner) ? 'nums' : 'fill';
    if (type === 'next') {
      const d = inner.match(/<div>([\s\S]*)<\/div>/);
      if (d) {
        const rows = [...d[1].matchAll(/<b>([\s\S]*?)<\/b>\s*<span>([\s\S]*?)<\/span>/g)].map((x) => `<tr><th>${text(x[1])}</th><td>${text(x[2])}</td></tr>`);
        inner = `<table>${rows.join('')}</table>`;
      }
    }
    if (type === 'nums') inner = inner.replace(/<div><b>([\s\S]*?)<\/b><span>([\s\S]*?)<\/span><\/div>/g, '<p><b>$1</b><br><small>$2</small></p>');
    blocks.push({ type, title, html: sanitize(inner) });
    blockRe.lastIndex = m.index + outer.length;
  }

  let extras = null;
  try { extras = readJSON(path.join(SRC, 'extras', C.prefix, e.date + '.json')); } catch (_) {}
  const base = lang.split('-')[0];
  const influencers = ((extras && extras.infl) || []).filter((i) => i && i.who && /^https?:\/\//.test(i.u || '')).slice(0, 6)
    .map((i) => ({ who: i.who, where: i.where || '', date: i.date || '', u: i.u, t: (i.t || {})[lang] || (i.t || {})[base] || (i.t || {}).en || '' }));
  const sources = extras && extras.src ? Object.entries(extras.src).flatMap(([id, a]) => (a || []).filter((o) => o && o.n && o.u && !o.search).map((o) => ({ id, n: o.n, u: o.u }))) : [];

  const glossary = Object.fromEntries(Object.entries(G).map(([k, v]) => [k, { f: v.f || '', d: v.d || '', w: v.w || '' }]));
  return {
    v: 1, region, lang, date: e.date, no: e.no,
    publishAt: e.publish_at || LOCAL2UTC(e.date, '06:00', C.tz),
    url: `https://dailydropnewspaper.com/${C.prefix}${e.date}/${native ? '' : lang + '/'}`,
    mast: { label, dateline: [place, rest.replace(/^,\s*/, '')].filter(Boolean).join(', '), time, house, ears },
    stories, blocks, glossary, influencers, sources,
    breaking: `/api/breaking.json?region=${region}&lang=${lang}`,
  };
}

// which editions to materialise (keep the repo and the fixture bundle small)
const WANT = { KR: { '*': ['ko'], '2026-10-10': ['ko', 'en', 'ja'] }, US: { '2026-10-10': ['en'], '2026-10-09': ['en'] }, JP: { '2026-10-10': ['ja'] } };
const GLOSS_MAX = 400;

function fixtures() {
  if (!BUILT) throw new Error('need <built-site>');
  const OUT = path.join(ROOT, 'fixtures/app/v1');
  fs.rmSync(path.join(ROOT, 'fixtures/app'), { recursive: true, force: true });
  const files = {};
  const put = (rel, obj) => {
    const f = path.join(OUT, rel);
    fs.mkdirSync(path.dirname(f), { recursive: true });
    fs.writeFileSync(f, JSON.stringify(obj));
    files[rel] = obj;
  };
  const API = path.join(BUILT, 'app/v1');
  if (fs.existsSync(path.join(API, 'index.json'))) copyFromApi(API, put);
  else synthesise(put);
  // sample breaking feed (same shape as /api/breaking.json)
  const now = Date.now(), ago = (m) => new Date(now - m * 60000).toISOString();
  put('breaking.json', { items: [
    { t: '[샘플] 속보 띠 개발용 항목 — 실제 속보가 아닙니다', u: 'https://dailydropnewspaper.com/', s: '데일리드롭', at: ago(4) },
    { t: '[Sample] Breaking ticker fixture item for development', u: 'https://dailydropnewspaper.com/us/', s: 'DailyDrop', at: ago(37) },
    { t: '[샘플] 출처가 “속보 검색”인 항목은 출처를 숨깁니다', u: 'https://dailydropnewspaper.com/', s: '속보 검색: 샘플', at: ago(95) },
  ] });
  // TS map for the bundler (only imported when EXPO_PUBLIC_USE_FIXTURES=1)
  const keys = Object.keys(files).sort();
  const ts = '// generated by scripts/from-site.js — do not edit\n/* eslint-disable */\nconst F: Record<string, unknown> = {\n' +
    keys.map((k) => `  ${JSON.stringify(k)}: require('./app/v1/${k}'),`).join('\n') + '\n};\nexport default F;\n';
  fs.writeFileSync(path.join(ROOT, 'fixtures/index.ts'), ts);
  console.log('wrote', keys.length, 'fixture files');
}

function copyFromApi(API, put) {
  const index = readJSON(path.join(API, 'index.json'));
  put('index.json', index);
  const langs = new Set();
  for (const r of index.regions) {
    for (const e of r.editions) {
      const want = WANT[r.code] && (WANT[r.code][e.date] || WANT[r.code]['*']);
      if (!want) continue;
      for (const l of e.langs.filter((x) => want.includes(x))) {
        const rel = `${r.code}/${e.date}.${l}.json`;
        if (fs.existsSync(path.join(API, rel))) { put(rel, readJSON(path.join(API, rel))); langs.add(l); }
      }
    }
  }
  for (const l of langs) {
    const f = path.join(API, 'glossary', l + '.json');
    if (fs.existsSync(f)) { const g = readJSON(f); put(`glossary/${l}.json`, { ...g, terms: g.terms.slice(0, GLOSS_MAX) }); }
  }
}

function synthesise(put) {
  const byRegion = {};
  const gloss = {};
  for (const e of EDITIONS) {
    const region = e.region || 'KR', C = CBY[region];
    const langs = [C.langs[0], ...Object.keys(e.translations || {})];
    (byRegion[region] ||= []).push({ date: e.date, no: e.no, langs });
    const want = WANT[region] && (WANT[region][e.date] || WANT[region]['*']);
    if (!want) continue;
    for (const lang of langs.filter((l) => want.includes(l))) {
      const native = C.langs[0] === lang;
      const bf = path.join(BUILT, C.prefix, e.date, native ? '' : lang, 'index.html');
      if (!fs.existsSync(bf)) { console.warn('missing', bf); continue; }
      const ed = edition(e, lang, bf);
      put(`${region}/${e.date}.${lang}.json`, ed);
      for (const [term, v] of Object.entries(ed.glossary)) {
        const g = (gloss[lang] ||= {});
        if (!g[term] || g[term].date < e.date) g[term] = { term, ...v, region, date: e.date };
      }
    }
  }
  const nameIn = (l, code) => { try { return new Intl.DisplayNames([l], { type: 'region' }).of(code); } catch (_) { return code; } };
  const regions = COUNTRIES.filter((c) => byRegion[c.code]).map((c) => {
    const eds = byRegion[c.code].sort((a, b) => b.date.localeCompare(a.date));
    const langs = [...new Set(eds.flatMap((x) => x.langs))];
    const nl = [...new Set(['ko', 'en', 'ja', ...langs])];
    return { code: c.code, name: Object.fromEntries(nl.map((l) => [l, nameIn(l, c.code)])), prefix: c.prefix, langs, tz: c.tz, latest: { date: eds[0].date, no: eds[0].no }, editions: eds };
  });
  put('index.json', { v: 1, generated: new Date().toISOString(), regions });
  for (const [lang, g] of Object.entries(gloss)) put(`glossary/${lang}.json`, { terms: Object.values(g).sort((a, b) => b.date.localeCompare(a.date) || a.term.localeCompare(b.term, lang)) });
}

if (cmd === 'i18n') i18n();
else if (cmd === 'fixtures') fixtures();
else { console.error('unknown command', cmd); process.exit(1); }
