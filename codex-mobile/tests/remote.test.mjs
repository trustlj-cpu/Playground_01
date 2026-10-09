import test from 'node:test'; import assert from 'node:assert/strict';
import { mergeEditions, transformEditionHtml, parseEditionUrl, defaultRegion, regionIndexUrl, editionFilePath, translationFor, targetLang } from '../src/remote-pure.mjs';
const bundled = [{ date: '2026-10-05', no: 1, blurb: 'a' }, { date: '2026-10-07', no: 3, blurb: 'c' }];
test('merge keeps bundled first, adds remote-only, sorts by date, ignores bad dates', () => {
  const m = mergeEditions(bundled, [{ date: '2026-10-07', no: 3, blurb: 'dup' }, { date: '2026-10-08', no: 4, blurb: 'd', html: 'https://dailydropnewspaper.com/2026-10-08/index.html' }, { date: 'x' }]);
  assert.deepEqual(m.map(e => e.date), ['2026-10-05', '2026-10-07', '2026-10-08']);
  assert.equal(m[1].source, 'bundle'); assert.equal(m[2].source, 'remote'); assert.equal(m[2].html, 'https://dailydropnewspaper.com/2026-10-08/index.html');
});
test('remote html url outside the site is replaced by the canonical one', () => {
  const m = mergeEditions([], [{ date: '2026-10-08', no: 4, html: 'https://evil.example/x.html' }]);
  assert.equal(m[0].html, 'https://dailydropnewspaper.com/2026-10-08/index.html');
});
test('transform strips google fonts, absolutizes site links, adds CSP and frame script', () => {
  const h = transformEditionHtml('<html><head><link rel="stylesheet" href="https://fonts.googleapis.com/css2?x"></head><body><a href="/glossary/">g</a><a href="//cdn/x">c</a></body></html>', 'http://localhost/frame.js');
  assert.ok(!h.includes('fonts.googleapis')); assert.ok(h.includes('href="https://dailydropnewspaper.com/glossary/"')); assert.ok(h.includes('href="//cdn/x"'));
  assert.ok(h.includes('Content-Security-Policy')); assert.ok(h.endsWith('<script src="http://localhost/frame.js"></script></body></html>'));
});
test('deep link parsing', () => {
  assert.equal(parseEditionUrl('https://dailydrop.kr/2026-10-07/'), '2026-10-07');
  assert.equal(parseEditionUrl('https://dailydropnewspaper.com/2026-10-09/'), '2026-10-09');
  assert.equal(parseEditionUrl('https://www.dailydropnewspaper.com/'), 'latest');
  assert.equal(parseEditionUrl('https://www.dailydrop.kr/'), 'latest');
  assert.equal(parseEditionUrl('https://dailydrop.kr/glossary/'), null);
  assert.equal(parseEditionUrl('http://dailydrop.kr/2026-10-07/'), null);
  assert.equal(parseEditionUrl('https://example.com/2026-10-07/'), null);
  assert.equal(parseEditionUrl('https://evil.dailydrop.kr/2026-10-07/'), null);
  assert.equal(parseEditionUrl('https://dailydrop.kr/2026-10-07/extra'), null);
  assert.equal(parseEditionUrl('https://dailydrop.kr/2026-10-07'), '2026-10-07');
});

test('transformEditionHtml injects the in-app header compaction CSS once', () => {
  const out = transformEditionHtml('<html><head></head><body><div class="sheet"></div></body></html>', '/frame.js');
  assert.equal((out.match(/id="dd-inapp"/g) || []).length, 1);
  assert.ok(out.indexOf('dd-inapp') < out.indexOf('</head>'));
});

test('regions: default from locale, index urls, deep links, file paths', () => {
  assert.equal(defaultRegion('ja-JP'), 'JP'); assert.equal(defaultRegion('en-US'), 'US'); assert.equal(defaultRegion('ko-KR'), 'KR'); assert.equal(defaultRegion(undefined), 'KR'); assert.equal(defaultRegion('de-DE'), 'US'); assert.equal(defaultRegion('zh-TW'), 'US'); assert.equal(defaultRegion('fr'), 'US');
  assert.equal(regionIndexUrl('US'), 'https://dailydropnewspaper.com/us/editions.json'); assert.equal(regionIndexUrl('KR'), 'https://dailydropnewspaper.com/editions.json');
  assert.equal(parseEditionUrl('https://dailydropnewspaper.com/us/2026-10-08/'), 'US:2026-10-08'); assert.equal(parseEditionUrl('https://dailydropnewspaper.com/jp/'), 'JP:latest'); assert.equal(parseEditionUrl('https://dailydropnewspaper.com/2026-10-07/'), '2026-10-07');
  assert.equal(editionFilePath('2026-10-08', 'US'), 'editions/us-2026-10-08.html'); assert.equal(editionFilePath('2026-10-07'), 'editions/2026-10-07.html');
  const m = mergeEditions([], [{ date: '2026-10-08', no: 1 }], 'US');
  assert.equal(m[0].html, 'https://dailydropnewspaper.com/us/2026-10-08/index.html'); assert.equal(m[0].region, 'US');
});

test('translations: remote index entries carry same-site translation urls; translationFor skips the edition language', () => {
  const remote = [{ date: '2026-10-07', no: 1, html: 'https://dailydropnewspaper.com/us/2026-10-07/index.html', translations: { ko: { html: 'https://dailydropnewspaper.com/us/2026-10-07/ko/index.html' }, xx: { html: 'https://evil.example/x.html' } } }];
  const [e] = mergeEditions([], remote, 'US');
  assert.deepEqual(e.translations, { ko: 'https://dailydropnewspaper.com/us/2026-10-07/ko/index.html' });
  assert.equal(translationFor(e, 'ko'), 'https://dailydropnewspaper.com/us/2026-10-07/ko/index.html');
  assert.equal(translationFor(e, 'en'), null);
  assert.equal(translationFor({ ...e, region: 'KR' }, 'ko'), null);
  assert.equal(editionFilePath('2026-10-07', 'US', 'ko'), 'editions/us-2026-10-07.ko.html');
  assert.equal(targetLang('ja-JP'), 'ja'); assert.equal(targetLang('fr'), 'en');
});
