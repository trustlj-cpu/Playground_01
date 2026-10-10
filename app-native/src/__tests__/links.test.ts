import { appPathFor } from '../lib/links';

describe('appPathFor (deep links → routes)', () => {
  it.each([
    ['https://dailydropnewspaper.com/', '/'],
    ['https://dailydropnewspaper.com/2026-10-10/', '/edition/KR/2026-10-10'],
    ['https://dailydropnewspaper.com/2026-10-10/en/#s3', '/edition/KR/2026-10-10?lang=en'],
    ['https://dailydropnewspaper.com/us/2026-10-09/', '/edition/US/2026-10-09'],
    ['https://dailydropnewspaper.com/2026-10-10/index.html', '/edition/KR/2026-10-10'],
    ['https://dailydropnewspaper.com/archive/', '/archive'],
    ['https://dailydropnewspaper.com/glossary/', '/glossary'],
    ['https://dailydropnewspaper.com/us/', '/'],
    ['https://dailydropnewspaper.com/about/', '/'],
    ['dailydrop://auth?code=abc&state=x', '/auth?code=abc&state=x'],
    ['/settings', '/settings'],
    ['/settings?x=%E0%A4%A' + '%'.repeat(5000), '/settings'],
    ['dailydrop://auth?code=abc&state=x%25%25&evil=1', '/auth?code=abc'],
    ['/edition/KR/2026-10-10', '/edition/KR/2026-10-10'],
    ['', '/'],
  ])('%s → %s', (input, out) => {
    expect(appPathFor(input)).toBe(out);
  });
});
