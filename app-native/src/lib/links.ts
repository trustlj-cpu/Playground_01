import { Linking } from 'react-native';

// Incoming links → app routes. The site's apple-app-site-association (site/build.js) claims
// /20*/ (dated KR editions, optionally /<lang>/), / , /archive/ and /glossary/ for the app; Expo Router would
// show "Unmatched route" for those web paths, so they are rewritten here (src/app/+native-intent.tsx).
// Region pages (/us/2026-10-10/) are mapped too, for the day the association covers them.
const ROUTES = /^\/(?:$|\(tabs\)|archive|glossary|bookmarks|settings|edition\/|auth(?:$|[/?]))/;

/** Incoming query strings are reduced to what the app reads (sign-in: code + state) and to URL-safe characters.
 *  Expo Router parses them with query-string → decode-uri-component 0.2.x, which has an exponential-time
 *  decoding bug (GHSA-vcc3-ghjq-m6fr): a crafted link must not reach it with percent-encoded input. */
function safeQuery(path: string, query: string): string {
  if (!query || !/^\/auth\/?$/.test(path)) return '';
  const keep: string[] = [];
  for (const part of query.slice(1, 2049).split('&')) {
    const m = part.match(/^(code|state)=([A-Za-z0-9._~-]{1,512})$/);
    if (m) keep.push(`${m[1]}=${m[2]}`);
  }
  return keep.length ? '?' + keep.join('&') : '';
}

export function appPathFor(input: string): string {
  let s = (input || '').trim();
  const m = s.match(/^([a-z][a-z0-9+.-]*):\/\/([^/?#]*)(.*)$/i);
  if (m) {
    // https://dailydropnewspaper.com/2026-10-10/en/ → /2026-10-10/en/ ; dailydrop://auth?code=… → /auth?code=…
    s = /^https?$/i.test(m[1]) ? m[3] : '/' + m[2] + m[3];
  }
  if (!s.startsWith('/')) s = '/' + s;
  const hashAt = s.indexOf('#');
  if (hashAt >= 0) s = s.slice(0, hashAt);
  const qAt = s.indexOf('?');
  const query = qAt >= 0 ? s.slice(qAt) : '';
  let p = (qAt >= 0 ? s.slice(0, qAt) : s).replace(/\/index\.html$/, '/').replace(/\/{2,}/g, '/');

  const ed = p.match(/^\/(?:([a-z]{2})\/)?(\d{4}-\d{2}-\d{2})\/?(?:([a-z]{2}(?:-[a-zA-Z]{2})?)\/?)?$/);
  if (ed) {
    const region = (ed[1] || 'kr').toUpperCase();
    return `/edition/${region}/${ed[2]}` + (ed[3] ? `?lang=${ed[3]}` : '');
  }
  p = p.replace(/^\/[a-z]{2}(?=\/(?:archive|glossary)?\/?$)/, ''); // /us/archive/ → /archive/
  if (/^\/archive\/?$/.test(p)) return '/archive';
  if (/^\/glossary\/?$/.test(p)) return '/glossary';
  if (/^\/(?:[a-z]{2}\/?)?$/.test(p)) return '/'; // front page of any region → Latest
  if (ROUTES.test(p)) return p.replace(/\/$/, '') + safeQuery(p, query) || '/';
  return '/'; // anything else the site links to: open the paper rather than an error screen
}

/** Opens a link from content (breaking items, sources, influencer posts, block HTML) in the browser — web links
 *  only: no intent:, file:, tel: or app schemes from data the app does not control. */
export function openExternal(u: string | undefined): void {
  if (!u || !/^https?:\/\/[^\s/]+/i.test(u)) return;
  Linking.openURL(u).catch(() => {});
}
