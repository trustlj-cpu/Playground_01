// 데일리드롭 일본어 후리가나(일본 신문 관례: 상용한자 밖 어려운 한자가 든 낱말에만 루비).
// 사용: node furigana.js  →  site/furigana.json { "<edition file>": [[표기, 읽기(히라가나)], ...] }
// kuromoji(형태소 분석기) 와 joyo-kanji(상용한자 2,136자) 가 있어야 한다: npm i --no-save kuromoji@0.1.2 joyo-kanji@0.2.1
// build.js 는 이 파일만 읽어 일본어 페이지 본문에서 낱말마다 첫 등장에 <ruby> 를 단다(용어사전 단어·스크립트·태그 속성은 건드리지 않음).
const fs = require('fs'), path = require('path');
const kuromoji = require('kuromoji'), JOYO = new Set(require('joyo-kanji').kanji);
const KANJI = /[一-鿿㐀-䶿々]/;
const hard = s => [...s].some(c => KANJI.test(c) && c !== '々' && !JOYO.has(c));
const hira = s => s.replace(/[ァ-ヶ]/g, c => String.fromCharCode(c.charCodeAt(0) - 0x60));
const files = [];
(function walk(d) { for (const f of fs.readdirSync(d)) { const p = path.join(d, f); if (fs.statSync(p).isDirectory()) walk(p); else if (/\.ja\.html$/.test(f) || (/[\\/]jp[\\/]/.test(p) && /^\d{4}-\d{2}-\d{2}\.html$/.test(f))) files.push(p); } })(path.join(__dirname, 'editions'));
const visible = h => h.replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/gi, ' ').replace(/<[^>]+>/g, ' ').replace(/&[a-z#0-9]+;/gi, ' ');
kuromoji.builder({ dicPath: path.join(path.dirname(require.resolve('kuromoji')), '..', 'dict') }).build((err, tk) => {
  if (err) { console.error('kuromoji:', err); process.exit(1); }
  const out = {};
  for (const f of files.sort()) {
    const seen = new Set(), list = [];
    for (const t of tk.tokenize(visible(fs.readFileSync(f, 'utf8')))) {
      const s = t.surface_form, r = t.reading && t.reading !== '*' ? hira(t.reading) : '';
      // 고유명사(인명·지명·조직)는 읽기가 틀리기 쉽다(한국·중국 인명은 현지음) → 제외. 1자 낱말도 문맥 오독이 많아 제외
      if (!r || !hard(s) || seen.has(s) || r === s || t.pos_detail_1 === '固有名詞' || t.pos !== '名詞' && t.pos !== '動詞' && t.pos !== '形容詞' || [...s].length < 2) continue;
      seen.add(s); list.push([s, r]);
    }
    if (list.length) out[path.relative(__dirname, f)] = list;
  }
  fs.writeFileSync(path.join(__dirname, 'furigana.json'), JSON.stringify(out, null, 0).replace(/\],\"/g, '],\n"') + '\n');
  console.log('furigana:', Object.keys(out).length, 'pages,', Object.values(out).reduce((a, b) => a + b.length, 0), 'words');
});
