import { editionForLocale } from '../lib/locale';

describe('editionForLocale', () => {
  it.each([
    ['ko', 'KR', null, 'KR', 'ko'],
    ['ja', 'JP', null, 'JP', 'ja'],
    ['en', 'US', null, 'US', 'en'],
    ['en', 'GB', null, 'GB', 'en'],
    ['en', 'AU', null, 'AU', 'en'],
    ['en', 'NZ', null, 'AU', 'en'],
    ['en', 'IN', null, 'IN', 'en'],
    ['hi', 'IN', null, 'IN', 'hi'],
    ['de', 'DE', null, 'DE', 'de'],
    ['de', 'CH', null, 'CH', 'de'],
    ['fr', 'CH', null, 'CH', 'fr'],
    ['fr', 'CA', null, 'CA', 'fr'],
    ['fr', 'FR', null, 'FR', 'fr'],
    ['es', 'ES', null, 'ES', 'es'],
    ['es', 'AR', null, 'MX', 'es'],
    ['pt', 'BR', null, 'BR', 'pt'],
    ['it', 'IT', null, 'IT', 'it'],
    ['nl', 'BE', null, 'NL', 'nl'],
    ['zh', 'TW', 'Hant', 'TW', 'zh-TW'],
    ['zh', 'CN', 'Hans', 'US', 'en'],
    ['en', 'DE', null, 'DE', 'en'],
    ['sv', 'SE', null, 'US', 'en'],
  ])('%s-%s → %s/%s', (l, cc, script, region, lang) => {
    const r = editionForLocale(l, cc, script);
    expect(r).toEqual({ region, lang });
  });
});
