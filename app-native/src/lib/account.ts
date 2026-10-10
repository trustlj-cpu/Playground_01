// Web account (dailydropnewspaper.com) for bookmark sync.
//
// The website keeps its session in an HttpOnly, SameSite=Lax cookie (dd_sid) and rejects writes whose
// Origin is not the site itself. A native app can neither read that cookie out of the system browser
// nor send a same-site Origin, so the app uses a small token hand-off that the site Worker must add
// (spec: README.md → "계정 연동 — 서버에 필요한 변경"):
//   1. GET  /api/auth/app/start?redirect_uri=dailydrop://auth&state=…&code_challenge=…&code_challenge_method=S256
//      in the system auth browser (shares the browser's cookies, so an existing web login is reused;
//      otherwise → /login/?next=…) → 302 dailydrop://auth?code=<one-time code>&state=…
//   2. POST /api/auth/app/token {code, code_verifier} → {token, user}   (PKCE, RFC 7636/8252; the token is a
//      normal sessions row, 30 days)
//   3. /api/me, /api/bookmarks, /api/auth/logout with  Authorization: Bearer <token>
// Until the server has these endpoints the whole feature stays behind EXPO_PUBLIC_ACCOUNT_SYNC=1.
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Crypto from 'expo-crypto';
import * as Linking from 'expo-linking';
import * as SecureStore from 'expo-secure-store';
import * as WebBrowser from 'expo-web-browser';
import { Platform } from 'react-native';
import { SITE_ORIGIN } from './api';

export const ACCOUNT_SYNC = process.env.EXPO_PUBLIC_ACCOUNT_SYNC === '1' && Platform.OS !== 'web';

const TOKEN_KEY = 'dd.account.token';
const USER_KEY = 'dd.account.user.v1'; // in the secure store (email/name are personal data); older builds kept it in AsyncStorage
const TIMEOUT_MS = 15_000;

/** fetch with a timeout: a request hanging on a captive portal or dead connection must not leave
 *  "Syncing…" on screen forever or block the sync queue. */
async function fetchT(url: string, init: RequestInit, ms = TIMEOUT_MS): Promise<Response> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), ms);
  try {
    return await fetch(url, { ...init, signal: ctrl.signal });
  } finally {
    clearTimeout(t);
  }
}

export interface AccountUser {
  id: number;
  email: string;
  name: string;
}

export interface ServerBookmark {
  id?: number;
  kind: 'article' | 'term';
  region: string;
  date: string;
  lang: string;
  ref: string;
  title?: string | null;
  url?: string | null;
  note?: string | null;
  created_at?: number;
}

export class AuthError extends Error {}
/** The server answered with an error status (not 401). 4xx other than 408/429 means the request itself is
 *  rejected and retrying it will not help. */
export class ApiError extends Error {
  constructor(public status: number, path: string) {
    super(`HTTP ${status} ${path}`);
  }
  get permanent() {
    return this.status >= 400 && this.status < 500 && this.status !== 408 && this.status !== 429;
  }
}

async function getToken(): Promise<string | null> {
  try {
    return await SecureStore.getItemAsync(TOKEN_KEY);
  } catch {
    return null;
  }
}

async function setToken(t: string | null) {
  try {
    if (t) await SecureStore.setItemAsync(TOKEN_KEY, t);
    else await SecureStore.deleteItemAsync(TOKEN_KEY);
  } catch {}
}

export async function savedUser(): Promise<AccountUser | null> {
  if (!ACCOUNT_SYNC) return null;
  if (!(await getToken())) return null;
  try {
    let raw = await SecureStore.getItemAsync(USER_KEY).catch(() => null);
    if (!raw) {
      // migrate from AsyncStorage (earlier builds)
      raw = await AsyncStorage.getItem(USER_KEY);
      if (raw) {
        await SecureStore.setItemAsync(USER_KEY, raw).catch(() => {});
        await SecureStore.deleteItemAsync(USER_KEY).catch(() => {});
  await AsyncStorage.removeItem(USER_KEY).catch(() => {});
      }
    }
    const u = raw ? JSON.parse(raw) : null;
    return u && typeof u === 'object' && u.id != null ? (u as AccountUser) : null;
  } catch {
    return null;
  }
}

async function call<T>(method: string, path: string, body?: unknown, token?: string | null): Promise<T> {
  const t = token ?? (await getToken());
  if (!t) throw new AuthError('signed out');
  const res = await fetchT(SITE_ORIGIN + path, {
    method,
    credentials: 'omit', // never mix in a browser cookie: the bearer token is the only credential
    headers: { accept: 'application/json', authorization: `Bearer ${t}`, ...(body ? { 'content-type': 'application/json' } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (res.status === 401) throw new AuthError('session expired');
  if (!res.ok) throw new ApiError(res.status, path);
  const text = await res.text();
  return (text ? JSON.parse(text) : {}) as T; // 204 / empty body
}

const b64url = (b64: string) => b64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const B64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';
/** n random bytes as base64url (no padding) */
const randomToken = (n: number) => {
  const bytes = Crypto.getRandomBytes(n);
  let out = '';
  for (let i = 0; i < bytes.length; i += 3) {
    const v = (bytes[i] << 16) | ((bytes[i + 1] ?? 0) << 8) | (bytes[i + 2] ?? 0);
    const chars = i + 2 < bytes.length ? 4 : i + 1 < bytes.length ? 3 : 2;
    for (let j = 0; j < chars; j++) out += B64[(v >> (18 - 6 * j)) & 63];
  }
  return out;
};

/** Opens the site's login in the system auth browser and exchanges the returned one-time code for a token. */
export async function signIn(): Promise<AccountUser | null> {
  const redirect = Linking.createURL('auth'); // dailydrop://auth in store builds
  const state = randomToken(16);
  const verifier = randomToken(32); // 43 chars
  const challenge = b64url(await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, verifier, { encoding: Crypto.CryptoEncoding.BASE64 }));
  const start =
    `${SITE_ORIGIN}/api/auth/app/start?redirect_uri=${encodeURIComponent(redirect)}&state=${state}` +
    `&code_challenge=${challenge}&code_challenge_method=S256`;
  const r = await WebBrowser.openAuthSessionAsync(start, redirect);
  if (r.type !== 'success') return null; // cancelled / dismissed
  const q = Linking.parse(r.url).queryParams || {};
  if (q.state !== state || typeof q.code !== 'string') throw new Error('bad_redirect');
  const res = await fetchT(SITE_ORIGIN + '/api/auth/app/token', {
    method: 'POST',
    credentials: 'omit',
    headers: { accept: 'application/json', 'content-type': 'application/json' },
    body: JSON.stringify({ code: q.code, code_verifier: verifier }),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} token`);
  const j = (await res.json()) as { token?: string; user?: AccountUser };
  if (!j.token || !j.user) throw new Error('no_token');
  await setToken(j.token);
  const user = { id: j.user.id, email: j.user.email, name: j.user.name || '' };
  await SecureStore.setItemAsync(USER_KEY, JSON.stringify(user)).catch(() => {});
  return user;
}

export async function signOut(): Promise<void> {
  const t = await getToken();
  await setToken(null);
  await SecureStore.deleteItemAsync(USER_KEY).catch(() => {});
  await AsyncStorage.removeItem(USER_KEY).catch(() => {});
  if (t) await call('POST', '/api/auth/logout', {}, t).catch(() => {});
}

export const listBookmarks = () =>
  call<{ items?: unknown }>('GET', '/api/bookmarks').then((j) =>
    (Array.isArray(j.items) ? j.items : []).filter(
      (x): x is ServerBookmark => !!x && typeof x.ref === 'string' && (x.kind === 'article' || x.kind === 'term') && typeof (x.region ?? '') === 'string' && typeof (x.date ?? '') === 'string',
    ).map((x) => ({ ...x, region: x.region ?? '', date: x.date ?? '' })),
  );
export const addBookmark = (b: ServerBookmark) => call<{ ok: boolean }>('POST', '/api/bookmarks', b);
export const deleteBookmark = (b: Pick<ServerBookmark, 'kind' | 'region' | 'date' | 'ref'>) =>
  call<{ ok: boolean }>('DELETE', '/api/bookmarks', { kind: b.kind, region: b.region, date: b.date, ref: b.ref });
