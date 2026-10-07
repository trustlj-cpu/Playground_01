import test from 'node:test';import assert from 'node:assert/strict';import {decodeSaved,toggleSaved,externalURL} from '../src/state.mjs';
const editions=[{date:'2026-10-05'},{date:'2026-10-07'}];
test('corrupt or unexpected saved storage recovers',()=>{for(const s of ['{bad','null','{}','42'])assert.deepEqual(decodeSaved(s,editions),[])});
test('saved entries deduplicate and reject unknown editions',()=>assert.deepEqual(decodeSaved('["2026-10-05","2026-10-05","2099-01-01",3]',editions),['2026-10-05']));
test('saving then removing preserves other editions',()=>assert.deepEqual(toggleSaved(toggleSaved(['2026-10-05'],'2026-10-07'),'2026-10-05'),['2026-10-07']));
test('external bridge rejects non-https and embedded credentials',()=>{for(const s of ['javascript:alert(1)','file:///tmp/a','http://dailydrop.kr','https://a:b@example.com','/relative'])assert.equal(externalURL(s),null);assert.equal(externalURL('https://dailydrop.kr/2026-10-07/'),'https://dailydrop.kr/2026-10-07/')});
