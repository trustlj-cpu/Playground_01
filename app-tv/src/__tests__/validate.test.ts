import { validFor } from '../shared/validate';

const fx = (p: string) => require('../../fixtures/app/v1/' + p);

describe('response validator (T19)', () => {
  it('accepts every fixture', () => {
    for (const p of ['index.json', 'KR/2026-10-10.ko.json', 'US/2026-10-10.en.json', 'JP/2026-10-10.ja.json']) expect(validFor(p, fx(p))).toBe(true);
    expect(validFor('/api/breaking.json?region=KR&lang=ko', fx('breaking.json'))).toBe(true);
  });
  it('rejects editions missing fields the TV uses', () => {
    const ed = JSON.parse(JSON.stringify(fx('KR/2026-10-10.ko.json')));
    expect(validFor('KR/2026-10-10.ko.json', { ...ed, no: '6' })).toBe(false);
    expect(validFor('KR/2026-10-10.ko.json', { ...ed, mast: { ...ed.mast, time: undefined } })).toBe(false);
    expect(validFor('KR/2026-10-10.ko.json', { ...ed, stories: [{ ...ed.stories[0], kick: null }] })).toBe(false);
    expect(validFor('KR/2026-10-10.ko.json', { ...ed, stories: [{ ...ed.stories[0], body: [1] }] })).toBe(false);
    expect(validFor('KR/2026-10-10.ko.json', { ...ed, blocks: [{ type: 'nums' }] })).toBe(false);
    expect(validFor('KR/2026-10-10.ko.json', { ...ed, glossary: { x: { f: 'a' } } })).toBe(false);
  });
  it('rejects an index with broken edition refs and breaking items without links', () => {
    const ix = JSON.parse(JSON.stringify(fx('index.json')));
    ix.regions[0].editions[0].no = undefined;
    expect(validFor('index.json', ix)).toBe(false);
    expect(validFor('/api/breaking.json', { items: [{ t: 'x' }] })).toBe(false);
  });
});
