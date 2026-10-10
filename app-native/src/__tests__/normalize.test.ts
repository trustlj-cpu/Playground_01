import { normBreaking, normEdition, normGlossary, normIndex, ShapeError } from '../lib/normalize';

const KR = require('../../fixtures/app/v1/KR/2026-10-10.ko.json');
const INDEX = require('../../fixtures/app/v1/index.json');
const clone = <T>(x: T): T => JSON.parse(JSON.stringify(x));

describe('normEdition', () => {
  it('keeps a real edition intact', () => {
    const e = normEdition(clone(KR));
    expect(e.stories).toHaveLength(KR.stories.length);
    expect(Object.keys(e.glossary)).toHaveLength(Object.keys(KR.glossary).length);
    expect(e.mast.label).toBe(KR.mast.label);
  });

  it('survives missing / null / wrong-typed fields', () => {
    const m = clone(KR);
    delete m.stories;
    m.glossary = null;
    m.influencers = null;
    m.blocks = [{ type: 'mystery', html: 5 }, null, 'x'];
    delete m.mast;
    const e = normEdition(m);
    expect(e.stories).toEqual([]);
    expect(e.glossary).toEqual({});
    expect(e.influencers).toEqual([]);
    expect(e.blocks).toEqual([{ type: 'mystery', title: undefined, html: '5' }]); // numbers become text; unknown types render as plain HTML
    expect(e.mast).toMatchObject({ label: '', dateline: '', time: '' });
  });

  it('drops unusable stories and fixes their fields', () => {
    const m = clone(KR);
    m.stories = [{ id: 'x', hl: 'H', body: 'not a list', popup: { what: 3, why: 'w' } }, { hl: 'no id' }, null];
    const e = normEdition(m);
    expect(e.stories).toHaveLength(1);
    expect(e.stories[0]).toMatchObject({ id: 'x', body: [], kick: '', dek: '' });
    expect(e.stories[0].popup).toEqual({ what: '3', why: 'w' });
  });

  it('rejects something that is not an edition', () => {
    expect(() => normEdition(null)).toThrow(ShapeError);
    expect(() => normEdition({ stories: [] })).toThrow(ShapeError);
    expect(() => normEdition('<html>')).toThrow(ShapeError);
  });
});

describe('normIndex / normGlossary / normBreaking', () => {
  it('index: real data passes, broken regions are dropped, empty index rejected', () => {
    expect(normIndex(clone(INDEX)).regions).toHaveLength(INDEX.regions.length);
    const m = clone(INDEX);
    m.regions[0].editions = null;
    m.regions[1] = { code: 'XX' };
    const n = normIndex(m);
    expect(n.regions[0].editions).toEqual([]);
    expect(n.regions.find((r) => r.code === 'XX')).toBeUndefined();
    expect(() => normIndex({ regions: [] })).toThrow(ShapeError);
  });

  it('glossary: empty / missing terms and duplicates', () => {
    expect(normGlossary({}).terms).toEqual([]);
    expect(normGlossary({ terms: [] }).terms).toEqual([]);
    expect(normGlossary({ terms: [{ term: 'a', d: 'x' }, { term: 'a', d: 'y' }, { d: 'no term' }] }).terms).toHaveLength(1);
  });

  it('breaking: only items with a title and a web link', () => {
    const b = normBreaking({ items: [{ t: 'ok', u: 'https://x.test/a' }, { t: 'js', u: 'javascript:alert(1)' }, { u: 'https://x' }, null] });
    expect(b.items.map((i) => i.t)).toEqual(['ok']);
    expect(normBreaking({}).items).toEqual([]);
  });
});
