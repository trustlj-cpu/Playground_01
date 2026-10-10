// First run: which edition (and reading language) to open, from the device locale.
// Same idea as the web's region pick, extended to all 17 editions. Languages per edition follow the API index
// (fixtures/app/v1/index.json); if an edition later drops a language, pickLang() falls back on its own.
const LANGS: Record<string, string[]> = {
  KR: ['ko', 'en', 'ja'],
  US: ['en', 'ko', 'ja'],
  JP: ['ja', 'en', 'ko'],
  GB: ['en', 'ko', 'ja'],
  DE: ['de', 'en', 'ko', 'ja'],
  FR: ['fr', 'en', 'ko', 'ja'],
  IN: ['en', 'ko', 'ja', 'hi'],
  AU: ['en', 'ko', 'ja'],
  CA: ['en', 'ko', 'ja', 'fr'],
  TW: ['zh-TW', 'en', 'ko', 'ja'],
  SG: ['en', 'ko', 'ja'],
  BR: ['pt', 'en', 'ko', 'ja'],
  MX: ['es', 'en', 'ko', 'ja'],
  IT: ['it', 'en', 'ko', 'ja'],
  ES: ['es', 'en', 'ko', 'ja'],
  NL: ['nl', 'en', 'ko', 'ja'],
  CH: ['de', 'en', 'ko', 'ja', 'fr', 'it'],
};
const LATAM = new Set(['MX', 'AR', 'CO', 'CL', 'PE', 'VE', 'EC', 'GT', 'CU', 'BO', 'DO', 'HN', 'PY', 'SV', 'NI', 'CR', 'PA', 'UY', 'PR']);
const BY_COUNTRY: Record<string, string> = { NZ: 'AU', AT: 'DE', BE: 'NL', HK: 'TW', MO: 'TW', IE: 'GB', PT: 'BR' };

export function editionForLocale(languageCode: string | null | undefined, regionCode?: string | null, script?: string | null): { region: string; lang: string } {
  const l = (languageCode || 'en').toLowerCase();
  const cc = (regionCode || '').toUpperCase();
  const pick = (region: string, lang: string) => ({ region, lang: LANGS[region].includes(lang) ? lang : LANGS[region][0] });
  switch (l) {
    case 'ko':
      return pick('KR', 'ko');
    case 'ja':
      return pick('JP', 'ja');
    case 'de':
      return pick(cc === 'CH' ? 'CH' : 'DE', 'de');
    case 'fr':
      return pick(cc === 'CH' ? 'CH' : cc === 'CA' ? 'CA' : 'FR', 'fr');
    case 'it':
      return pick(cc === 'CH' ? 'CH' : 'IT', 'it');
    case 'es':
      return pick(LATAM.has(cc) || cc === 'US' ? 'MX' : 'ES', 'es');
    case 'pt':
      return pick('BR', 'pt');
    case 'nl':
      return pick('NL', 'nl');
    case 'zh': {
      const hant = (script || '').toLowerCase() === 'hant' || ['TW', 'HK', 'MO'].includes(cc);
      return hant ? pick('TW', 'zh-TW') : pick('US', 'en');
    }
    case 'hi':
      return pick('IN', 'hi');
  }
  // English (or a language no edition carries): the country decides, read in English where possible
  const region = LANGS[cc] ? cc : BY_COUNTRY[cc] && LANGS[BY_COUNTRY[cc]] ? BY_COUNTRY[cc] : 'US';
  return { region, lang: LANGS[region].includes('en') ? 'en' : LANGS[region][0] };
}
