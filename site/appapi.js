// 앱용 콘텐츠 API(/app/v1, 정적 JSON) — 스펙: ops/app/API.md
// build.js가 페이지를 다 쓴 뒤 한 번 부른다: build(ctx) → OUT/app/v1/{index.json, <REGION>/<date>.<lang>.json, glossary/<lang>.json}
// 예약 호는 build.js가 이미 뺀 상태(publish_at <= DD_NOW 만). schedule.js는 aggregate()로 공개 시각별 index·glossary 사본을 _sched에 만든다.
// 의존성 없음: 작은 HTML 파서·정화기를 여기서 직접 구현. 호 하나가 깨져도 경고만 남기고 빌드는 계속.
const fs = require('fs'), path = require('path'), vm = require('vm');

// ── 작은 HTML 파서(트리) ─────────────────────────────────────────
const VOID = new Set(['area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta', 'source', 'track', 'wbr']);
const RAW = new Set(['script', 'style', 'textarea', 'title']);
const P_CLOSERS = new Set(['p', 'div', 'ul', 'ol', 'table', 'section', 'article', 'aside', 'header', 'footer', 'main', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'figure', 'hr']);
const parseAttrs = s => { const a = {}; const re = /([^\s"'>\/=]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'>]+)))?/g; let m; while ((m = re.exec(s))) a[m[1].toLowerCase()] = decode(m[2] ?? m[3] ?? m[4] ?? ''); return a; };
function parse(html) {
  const root = { tag: '#root', attrs: {}, children: [], parent: null }; let cur = root, last = 0;
  const re = /<!--[\s\S]*?-->|<!doctype[^>]*>|<(\/?)([a-zA-Z][\w-]*)((?:\s+[^\s"'>\/=]+(?:\s*=\s*(?:"[^"]*"|'[^']*'|[^\s"'>]+))?)*)\s*(\/?)>/gi; let m;
  const text = t => { if (t) cur.children.push({ tag: '#text', text: t, parent: cur }); };
  while ((m = re.exec(html))) {
    text(html.slice(last, m.index)); last = re.lastIndex;
    if (!m[2]) continue; // comment/doctype
    const tag = m[2].toLowerCase();
    if (m[1]) { // 닫는 태그: 같은 이름의 열린 요소까지 올라간다(없으면 무시)
      let n = cur; while (n && n.tag !== tag) n = n.parent; if (n && n.parent) cur = n.parent; continue;
    }
    if (cur.tag === 'p' && P_CLOSERS.has(tag)) cur = cur.parent;
    if (tag === 'li' && cur.tag === 'li') cur = cur.parent;
    const el = { tag, attrs: parseAttrs(m[3] || ''), children: [], parent: cur }; cur.children.push(el);
    if (RAW.has(tag)) { const end = html.toLowerCase().indexOf('</' + tag, last); const stop = end < 0 ? html.length : end; el.children.push({ tag: '#text', text: html.slice(last, stop), parent: el }); const gt = html.indexOf('>', stop); last = re.lastIndex = gt < 0 ? html.length : gt + 1; continue; }
    if (!VOID.has(tag) && !m[4]) cur = el;
  }
  text(html.slice(last)); return root;
}
const ENT = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', middot: '·', hellip: '…', ndash: '–', mdash: '—', lsquo: '‘', rsquo: '’', ldquo: '“', rdquo: '”', laquo: '«', raquo: '»', times: '×', minus: '−', deg: '°', euro: '€', pound: '£', yen: '¥', copy: '©', shy: '' };
function decode(s) { return String(s).replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (m0, k) => { if (k[0] === '#') { const n = k[1] === 'x' || k[1] === 'X' ? parseInt(k.slice(2), 16) : +k.slice(1); try { return String.fromCodePoint(n); } catch (e) { return m0; } } const v = ENT[k.toLowerCase()]; return v == null ? m0 : v; }); }
const cls = n => (n.attrs && n.attrs.class ? n.attrs.class.split(/\s+/) : []);
const has = (n, c) => n.tag[0] !== '#' && cls(n).includes(c);
const els = n => n.children.filter(c => c.tag[0] !== '#');
function all(n, pred, out = [], stopInside = false) { for (const c of n.children) { if (c.tag[0] === '#') continue; const hit = pred(c); if (hit) out.push(c); if (!(hit && stopInside)) all(c, pred, out, stopInside); } return out; }
const first = (n, pred) => all(n, pred)[0] || null;
const inside = (n, pred) => { for (let p = n.parent; p; p = p.parent) if (p.tag[0] !== '#' && pred(p)) return true; return false; };
const BLOCKISH = new Set(['p', 'div', 'li', 'br', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'tr', 'section', 'article']);
function rawText(n) { if (n.tag === '#text') return decode(n.text); if (n.tag === 'script' || n.tag === 'style' || n.tag === 'svg') return ''; if (n.tag === 'br') return ' '; const t = n.children.map(rawText).join(''); return BLOCKISH.has(n.tag) ? ' ' + t + ' ' : t; }
const clean = s => String(s || '').replace(/\s+/g, ' ').trim();
const text = n => (n ? clean(rawText(n)) : '');
// 문자열 속 HTML(팝업·용어 데이터) → 평문
const plain = s => clean(decode(String(s == null ? '' : s).replace(/<br\s*\/?>/gi, ' ').replace(/<[^>]+>/g, '')));

// ── 정화기: 허용 태그만(b,i,em,strong,a,br,p,ul,ol,li,span,small,table,tr,td,th), 속성은 a[href](http/https/상대경로)만 ─
const ALLOW = new Set(['b', 'i', 'em', 'strong', 'a', 'br', 'p', 'ul', 'ol', 'li', 'span', 'small', 'table', 'tr', 'td', 'th']);
const DROP = new Set(['script', 'style', 'svg', 'button', 'iframe', 'object', 'embed', 'form', 'input', 'select', 'textarea', 'template', 'noscript', 'img', 'video', 'audio', 'canvas', 'link', 'meta']);
const BLOCK_IN = n => all(n, c => P_CLOSERS.has(c.tag) || c.tag === 'li').length > 0;
const escT = s => String(s).replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));
const escA = s => escT(s).replace(/"/g, '&quot;');
const okHref = u => /^(https?:\/\/[^\s"'<>]+|\/[^\s"'<>]*)$/.test(String(u || ''));
function kids(n, spaced) { let out = '', prevEl = false; for (const c of n.children) { const isEl = c.tag[0] !== '#'; const s = ser(c); if (!s) continue; if (spaced && isEl && prevEl && !/^\s/.test(s) && !/\s$/.test(out)) out += ' '; out += s; prevEl = isEl; } return out; }
function ser(n) {
  if (n.tag === '#text') return escT(decode(n.text));
  if (DROP.has(n.tag)) return '';
  if (n.tag === 'br') return '<br>';
  if (ALLOW.has(n.tag)) { if (n.tag === 'a') { const h = n.attrs.href; return okHref(h) ? `<a href="${escA(h)}">${kids(n)}</a>` : kids(n); } if (n.tag === 'p' || n.tag === 'li') return `<${n.tag}>${kids(n, true)}</${n.tag}>`; return `<${n.tag}>${kids(n)}</${n.tag}>`; }
  if (n.tag === 'thead' || n.tag === 'tbody' || n.tag === 'tfoot') return kids(n);
  if (/^h[1-6]$/.test(n.tag)) { const t = kids(n); return t.trim() ? `<p><b>${t}</b></p>` : ''; }
  // div 등 블록 컨테이너: 안에 블록이 없으면 <p>로. 'b 라벨 + span 설명'이 한 칸에 여러 쌍(주목할 일정)이면 쌍마다 <p>
  if (n.tag === 'div' || n.tag === 'section' || n.tag === 'article' || n.tag === 'aside' || n.tag === 'header' || n.tag === 'footer' || n.tag === 'figure' || n.tag === 'figcaption' || n.tag === 'blockquote') {
    if (BLOCK_IN(n)) return kids(n);
    const ch = els(n); const bs = ch.filter(c => c.tag === 'b');
    if (bs.length > 1 && ch[0] && ch[0].tag === 'b' && ch.every(c => c.tag === 'b' || c.tag === 'span')) {
      const groups = []; for (const c of n.children) { if (c.tag === 'b') groups.push([]); if (groups.length) groups[groups.length - 1].push(c); }
      return groups.map(g => `<p>${kids({ children: g }, true)}</p>`).join('');
    }
    const t = kids(n, true); return t.trim() ? `<p>${t}</p>` : '';
  }
  return kids(n); // 그 밖의 태그는 벗기고 내용만
}
const sanitize = (n, skip) => clean(n.children.filter(c => !(skip && skip(c))).map(ser).join('').replace(/\s+/g, ' ')).replace(/<p>\s*<\/p>/g, '');

// ── 페이지 속 데이터 객체(const A / const G): JS 객체 리터럴 → vm으로 안전하게 평가 ──
function literal(html, name) {
  const m = String(html).match(new RegExp(`const ${name} = (\\{[\\s\\S]*?\\n  \\});\\n`)) || String(html).match(new RegExp(`const ${name}\\s*=\\s*(\\{[\\s\\S]*?\\n\\s*\\});`));
  if (!m) return null; try { const v = vm.runInNewContext('(' + m[1] + ')', Object.create(null), { timeout: 1000 }); return v && typeof v === 'object' ? v : null; } catch (e) { return null; }
}

// ── 호 한 판(한 언어) → JSON ──
const POP = ['kick', 'title', 'what', 'why', 'me', 'a', 'b', 'say', 'src'];
const BLOCK_CLS = ['fill', 'rumor', 'next', 'glos', 'colophon', 'one', 'strip'];
function extract(html) {
  const doc = parse(html), out = { stories: [], blocks: [], mast: {}, A: literal(html, 'A') || {}, G: literal(html, 'G') || {} };
  // 이야기: .story[data-id] 문서 순서. 큰 기사(.kick·h2/h3.hl·.deck·.body/.one 문단)와 색인 단신(.it: b 제목·em 요약·span 분류)
  for (const s of all(doc, n => has(n, 'story') && n.attrs['data-id'])) {
    try {
      const id = s.attrs['data-id']; const st = { id, rank: out.stories.length, kick: '', hl: '', dek: '', body: [] };
      const k = first(s, n => has(n, 'kick'));
      if (k) { const main = clean(k.children.filter(c => c.tag !== 'span').map(rawText).join('')); const sub = clean(k.children.filter(c => c.tag === 'span').map(rawText).join(' ')); st.kick = [main, sub].filter(Boolean).join(' · '); }
      const hl = first(s, n => has(n, 'hl')); st.hl = text(hl);
      const dk = first(s, n => has(n, 'deck') || has(n, 'dek') || (has(n, 'sub') && !inside(n, x => has(x, 'mast'))));
      st.dek = text(dk);
      for (const b of all(s, n => has(n, 'body') || has(n, 'one'), [], true)) { if (inside(b, x => has(x, 'fill'))) continue; const ps = all(b, n => n.tag === 'p'); if (ps.length) ps.forEach(p => { const t = text(p); if (t) st.body.push(t); }); else { const t = text(b); if (t) st.body.push(t); } }
      if (has(s, 'it')) { // 색인 단신
        const ch = els(s); if (!st.hl) st.hl = text(ch.find(c => c.tag === 'b' || c.tag === 'strong')); if (!st.dek) st.dek = text(ch.find(c => c.tag === 'em' || c.tag === 'p')); if (!st.kick) st.kick = text(ch.find(c => c.tag === 'span' || c.tag === 'small'));
      }
      const a = out.A[id]; if (a && typeof a === 'object') { st.popup = {}; for (const f of POP) st.popup[f] = plain(a[f]); }
      out.stories.push(st);
    } catch (e) { /* 한 기사 실패는 건너뜀 */ }
  }
  // 보조 블록: 가장 바깥 것만(안쪽 .nums 등은 그 블록의 html에 포함). 기사 안의 '오늘의 숫자' 같은 .fill 도 블록으로
  // .strip(기사 묶음)·.one(기사 본문)은 기사를 품고 있으면 블록이 아니라 그 안을 계속 살핀다
  const blks = []; const walk = n => { for (const c of els(n)) { const t = BLOCK_CLS.find(k => has(c, k)); if (t && !((t === 'one' || t === 'strip') && (has(c, 'story') || inside(c, x => has(x, 'story')) || all(c, x => has(x, 'story')).length))) blks.push(c); else walk(c); } }; walk(doc);
  for (const b of blks) {
    try {
      let type = BLOCK_CLS.find(c => has(b, c));
      if (type === 'fill' && first(b, x => has(x, 'nums'))) type = 'nums';
      const head = els(b).find(c => /^h[1-6]$/.test(c.tag)); const title = text(head);
      const html = sanitize(b, c => c === head); if (!html && !title) continue;
      out.blocks.push({ type, title, html });
    } catch (e) { }
  }
  const ears = all(doc, n => has(n, 'ear')).map(e => { const b = els(e).find(c => c.tag === 'b'); return clean([text(b), clean(e.children.filter(c => c !== b).map(rawText).join(''))].filter(Boolean).join(' ')); }).filter(Boolean);
  out.mast = { house: text(first(doc, n => has(n, 'house'))), ears };
  return out;
}

// ── 공용 ──
const COUNTRIES = JSON.parse(fs.readFileSync(path.join(__dirname, 'countries.json'), 'utf8'));
const I18N = JSON.parse(fs.readFileSync(path.join(__dirname, 'i18n.json'), 'utf8'));
const LANGS = ['en', 'ko', 'ja', ...Object.keys(I18N).filter(l => !['en', 'ko', 'ja'].includes(l))];
const cname = (l, k) => { const o = (I18N[l] && I18N[l].country || {})[k]; if (o) return o; try { return new Intl.DisplayNames([l], { type: 'region' }).of(k); } catch (e) { return k; } };
const write = (f, o) => { fs.mkdirSync(path.dirname(f), { recursive: true }); fs.writeFileSync(f, JSON.stringify(o)); };
const iso = t => { const n = typeof t === 'number' ? t : Date.parse(t); return isFinite(n) ? new Date(n).toISOString() : null; };

// 호별 파일들(appDir/<REGION>/<date>.<lang>.json)을 모아 index·용어사전을 만든다. keep(region, date)로 거른다(예약 사본용).
function aggregate(appDir, keep = () => true, generated = new Date().toISOString()) {
  const eds = [];
  for (const c of COUNTRIES) {
    const d = path.join(appDir, c.code); let fl = []; try { fl = fs.readdirSync(d); } catch (e) { continue; }
    for (const f of fl) { const m = f.match(/^(\d{4}-\d{2}-\d{2})\.([A-Za-z-]+)\.json$/); if (!m || !keep(c.code, m[1])) continue; try { eds.push({ region: c.code, file: path.join(d, f), j: JSON.parse(fs.readFileSync(path.join(d, f), 'utf8')) }); } catch (e) { } }
  }
  const regions = [];
  for (const c of COUNTRIES) {
    const mine = eds.filter(x => x.region === c.code); if (!mine.length) continue;
    const own = c.langs[0]; const byDate = new Map();
    for (const x of mine) { const k = x.j.date; if (!byDate.has(k)) byDate.set(k, { date: k, no: x.j.no, langs: [] }); byDate.get(k).langs.push(x.j.lang); }
    const order = l => (l === own ? -1 : LANGS.indexOf(l) < 0 ? 999 : LANGS.indexOf(l));
    const list = [...byDate.values()].sort((a, b) => b.date.localeCompare(a.date)); list.forEach(e => e.langs.sort((a, b) => order(a) - order(b)));
    const langs = [...new Set(list.flatMap(e => e.langs))].sort((a, b) => order(a) - order(b));
    regions.push({ code: c.code, name: Object.fromEntries(LANGS.map(l => [l, cname(l, c.code)])), prefix: c.prefix, langs, tz: c.tz, latest: { date: list[0].date, no: list[0].no }, editions: list });
  }
  const glossary = {};
  const ri = r => COUNTRIES.findIndex(c => c.code === r);
  for (const x of [...eds].sort((a, b) => (Date.parse(b.j.publishAt) || 0) - (Date.parse(a.j.publishAt) || 0) || b.j.date.localeCompare(a.j.date) || ri(a.region) - ri(b.region))) {
    const g = (glossary[x.j.lang] ||= { seen: new Set(), terms: [] });
    for (const [term, v] of Object.entries(x.j.glossary || {})) { if (g.seen.has(term)) continue; g.seen.add(term); g.terms.push({ term, f: v.f || '', d: v.d || '', w: v.w || '', region: x.region, date: x.j.date }); }
  }
  return { index: { v: 1, generated, regions }, glossary: Object.fromEntries(Object.entries(glossary).map(([l, g]) => [l, { terms: g.terms }])) };
}
function writeAggregate(appDir, outDir, keep, generated) {
  const { index, glossary } = aggregate(appDir, keep, generated);
  write(path.join(outDir, 'index.json'), index);
  for (const [l, g] of Object.entries(glossary)) write(path.join(outDir, 'glossary', l + '.json'), g);
  return { index, glossary };
}

// build.js에서 호출. ctx: { OUT, SITE, SPECDIR, editions, h: { EDTXT, TZ, COUNTRY, dateIn, isAM, PUBAT, EXTRA, okUrl } }
function build(ctx) {
  const { OUT, SITE, SPECDIR, editions, h } = ctx; const appDir = path.join(OUT, 'app', 'v1'); const CBY = Object.fromEntries(COUNTRIES.map(c => [c.code, c]));
  let n = 0, fail = 0;
  for (const e of editions) {
    const region = e.region || 'KR', c = CBY[region]; if (!c) continue; const own = c.langs[0];
    let X = null; try { X = h.EXTRA(e); } catch (err) { }
    const variants = [[own, e.file, `${SITE}/${c.prefix}${e.date}/`], ...Object.entries(e.translations || {}).map(([l, f]) => [l, path.resolve(SPECDIR, f), `${SITE}/${c.prefix}${e.date}/${l}/`])];
    for (const [lang, file, url] of variants) {
      try {
        const html = fs.readFileSync(file, 'utf8'); const x = extract(html);
        const z = h.TZ(region, e.date, lang), am = h.isAM(e.date);
        const time = lang === 'en' ? `${am ? '6:00 a.m.' : '6:00 p.m.'} ${z}` : `${am ? '06:00' : '18:00'} ${z}`;
        const glossary = {}; for (const [k, v] of Object.entries(x.G)) if (v && typeof v === 'object') glossary[k] = { f: plain(v.f), d: plain(v.d), w: plain(v.w) };
        const influencers = ((X && X.infl) || []).filter(i => i && i.who && h.okUrl(i.u)).slice(0, 6).map(i => { const t = i.t || {}; return { who: String(i.who), where: String(i.where || ''), date: String(i.date || ''), u: i.u, t: String(t[lang] || t[String(lang).split('-')[0]] || t.en || t[own] || '') }; });
        const sources = []; for (const [id, v] of Object.entries((X && X.src) || {})) for (const o of (Array.isArray(v) ? v : [])) if (o && o.n && h.okUrl(o.u) && !o.search) sources.push({ id, n: String(o.n), u: o.u, alt: (o.alt || []).map(String) });
        // 제호 아래 시세표(웹 .tape와 같은 값·같은 문구): 종목명·값·▲▼·등락, 아래 안내 문구
        let tape = null; try { const t = first(parse(h.TAPE ? h.TAPE(e.date, region, lang) : ''), n => has(n, 'tape')); if (t) tape = { note: t.attrs['data-note'] || '', q: els(t).filter(q => has(q, 'q')).map(q => { const f = tg => els(q).find(c => c.tag === tg); const i = f('i'); const u = i && els(i).find(c => c.tag === 'u'); const sp = i && els(i).find(c => c.tag === 'span'); return { k: q.attrs['data-k'] || '', name: text(f('b')), v: text(f('em')), dir: has(q, 'dn') ? 'dn' : has(q, 'upp') ? 'up' : '', tri: text(u), chg: text(sp), asof: text(f('small')) }; }) }; } catch (err) { tape = null; }
        const doc = {
          v: 1, region, lang, date: e.date, no: e.no, publishAt: iso(h.PUBAT(e)), url,
          mast: { label: h.EDTXT(lang, region, e.no, e.date).num, dateline: `${h.COUNTRY(lang, region)}, ${h.dateIn(lang)(e.date)}`, time, house: x.mast.house, ears: x.mast.ears, ...(tape && tape.q.length ? { tape } : {}) },
          stories: x.stories, blocks: x.blocks, glossary, influencers, sources,
          breaking: `/api/breaking.json?region=${region}&lang=${lang}`,
        };
        write(path.join(appDir, region, `${e.date}.${lang}.json`), doc); n++;
      } catch (err) { fail++; console.warn(`app api: ${region} ${e.date} ${lang} skipped: ${err.message}`); }
    }
  }
  const { index } = writeAggregate(appDir, appDir);
  console.log(`app api: ${n} edition files, ${index.regions.length} regions${fail ? `, ${fail} skipped` : ''}`);
}

module.exports = { build, aggregate, writeAggregate, extract, parse, sanitize };
