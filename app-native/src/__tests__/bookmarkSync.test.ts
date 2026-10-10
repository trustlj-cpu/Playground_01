import type { ServerBookmark } from '../lib/account';
import { articleKey, type ArticleBookmark, enqueue, type Op, parseArticles, parseOutbox, parseTerms, reconcile, termKey, toServerArticle } from '../lib/bookmarkSync';

const art = (id: string, at = 1, extra: Partial<ArticleBookmark> = {}): ArticleBookmark => ({
  key: articleKey('KR', '2026-10-10', id),
  id,
  region: 'KR',
  lang: 'ko',
  date: '2026-10-10',
  no: 6,
  kick: 'K',
  hl: 'HL ' + id,
  url: '/2026-10-10/',
  at,
  ...extra,
});
const post = (a: ArticleBookmark): Op => ({ m: 'POST', b: toServerArticle(a) });
const del = (a: ArticleBookmark): Op => ({ m: 'DELETE', b: toServerArticle(a) });
const srv = (id: string, extra: Partial<ServerBookmark> = {}): ServerBookmark => ({ kind: 'article', region: 'KR', date: '2026-10-10', lang: 'ko', ref: id, title: 'T ' + id, ...extra });

describe('enqueue (outbox)', () => {
  it('a queued POST and a DELETE of the same item cancel out', () => {
    const A = art('a');
    expect(enqueue([post(A)], del(A), null)).toEqual([]);
  });

  it('race (a): un-bookmark while the POST is in flight keeps the DELETE', () => {
    const A = art('a');
    const p = post(A);
    const out = enqueue([p], del(A), p);
    expect(out).toEqual([p, del(A)]);
    // after the POST's response the provider removes exactly that op → the DELETE is still sent
    expect(out.filter((o) => o !== p)).toEqual([del(A)]);
  });

  it('race (b): A in flight, un-bookmark A + bookmark B → B survives A completing', () => {
    const A = art('a');
    const B = art('b');
    const p = post(A);
    let out = enqueue([p], del(A), p);
    out = enqueue(out, post(B), p);
    const after = out.filter((o) => o !== p);
    expect(after).toEqual([del(A), post(B)]);
  });

  it('toggle on → off → on while in flight ends with only the in-flight POST', () => {
    const A = art('a');
    const p = post(A);
    let out = enqueue([p], del(A), p);
    out = enqueue(out, post(A), p);
    expect(out).toEqual([p]);
  });
});

describe('reconcile', () => {
  it('first merge: union, device-only items are uploaded', () => {
    const local = [art('a', 5)];
    const r = reconcile([srv('b', { created_at: 3 })], local, [], [], true);
    expect(r.articles.map((x) => x.id).sort()).toEqual(['a', 'b']);
    expect(r.upload.map((x) => x.ref)).toEqual(['a']);
  });

  it('later syncs: the account list is the truth', () => {
    const r = reconcile([srv('b')], [art('a'), art('b')], [], [], false);
    expect(r.articles.map((x) => x.id)).toEqual(['b']);
    expect(r.upload).toEqual([]);
  });

  it('pending local changes win over the server list', () => {
    const A = art('a');
    const B = art('b');
    // A un-bookmarked locally (DELETE pending) but still on the server; B bookmarked locally, not yet on the server
    const r = reconcile([srv('a')], [B], [], [del(A), post(B)], false);
    expect(r.articles.map((x) => x.id)).toEqual(['b']);
  });

  it('keeps local details (kick, no) for server items and dedupes the server list', () => {
    const r = reconcile([srv('a'), srv('a')], [art('a', 9)], [], [], false);
    expect(r.articles).toHaveLength(1);
    expect(r.articles[0]).toMatchObject({ kick: 'K', no: 6, at: 9 });
  });

  it('the same article read in two languages is one bookmark (server identity)', () => {
    const r = reconcile([srv('a', { lang: 'en' })], [art('a', 1, { lang: 'ko' })], [], [], false);
    expect(r.articles).toHaveLength(1);
    expect(r.articles[0].key).toBe('KR:2026-10-10:a');
  });

  it('terms: identity is the term itself', () => {
    const t = { key: termKey('GDP'), term: 'GDP', f: '', d: 'd', w: '', region: 'KR', lang: 'ko', date: '2026-10-10', at: 1 };
    const r = reconcile([{ kind: 'term', region: 'US', date: '2026-10-09', lang: 'en', ref: 'GDP' }], [], [t], [], false);
    expect(r.terms).toHaveLength(1);
    expect(r.terms[0].d).toBe('d');
  });
});

describe('stored lists', () => {
  it('migrates old keys (with language) and drops junk', () => {
    const raw = JSON.stringify([
      { key: 'KR:2026-10-10:ko:a', id: 'a', region: 'KR', date: '2026-10-10', lang: 'ko', hl: 'x', at: 1 },
      { key: 'KR:2026-10-10:en:a', id: 'a', region: 'KR', date: '2026-10-10', lang: 'en', hl: 'y', at: 2 },
      null,
      42,
      { nope: true },
    ]);
    const list = parseArticles(raw)!;
    expect(list).toHaveLength(1);
    expect(list[0]).toMatchObject({ key: 'KR:2026-10-10:a', lang: 'en' });
    expect(parseArticles('not json')).toBeNull();
    expect(parseArticles('{"a":1}')).toBeNull();
    expect(parseTerms(JSON.stringify([{ key: 'ko:GDP', term: 'GDP', at: 1 }]))![0].key).toBe('GDP');
    expect(parseOutbox('[{"m":"POST","b":{"ref":"a"}},{"m":"X"}]')).toHaveLength(1);
    expect(parseOutbox('garbage')).toEqual([]);
  });
});
