import { createSingleFlight } from './single-flight.mjs';
import { readPreference } from './preferences.mjs';
// 원격 갱신·오프라인 저장·푸시·딥링크 (Capacitor 8, 정적 import — esbuild 번들에 플러그인 포함)
import { Capacitor } from '@capacitor/core';
import { Preferences } from '@capacitor/preferences';
import { Filesystem, Directory, Encoding } from '@capacitor/filesystem';
import { App } from '@capacitor/app';
import { PushNotifications } from '@capacitor/push-notifications';
import { SITE, FEED, REGIONS, regionIndexUrl, mergeEditions, transformEditionHtml, parseEditionUrl, editionFilePath } from './remote-pure.mjs';

const K_INDEX = 'dailydrop.remoteIndex.v1', K_PUSH = 'dailydrop.push.v1', K_TOKEN = 'dailydrop.pushToken.v1';
const native = () => Capacitor.isNativePlatform();

// 캐시된 원격 목록(네트워크 없음) — 시작 시 보관 표시 복원에 쓴다
const indexKey = region => region && region !== 'KR' ? `${K_INDEX}.${region}` : K_INDEX;
export async function getCachedRemoteIndex(region = 'KR') {
  try { const v = (await readPreference(indexKey(region))).value; return v ? (JSON.parse(v).editions || []) : []; } catch { return []; }
}
// 원격 목록: 성공하면 캐시 갱신, 실패하면 캐시(없으면 [])를 돌려준다 — 오프라인 초기화를 막지 않음
export async function loadRemoteIndex({ timeoutMs = 8000, region = 'KR' } = {}) {
  let cached = [];
  try { const v = (await readPreference(indexKey(region))).value; if (v) cached = JSON.parse(v).editions || []; } catch {}
  try {
    const ctl = new AbortController(); const t = setTimeout(() => ctl.abort(), timeoutMs);
    const r = await fetch(regionIndexUrl(region), { cache: 'no-store', signal: ctl.signal }); clearTimeout(t);
    if (!r.ok) throw new Error('index ' + r.status);
    const j = await r.json(); const editions = Array.isArray(j.editions) ? j.editions : [];
    try { await Preferences.set({ key: indexKey(region), value: JSON.stringify({ at: Date.now(), editions }) }); } catch {}
    return { editions, fresh: true };
  } catch (e) { return { editions: cached, fresh: false, error: String(e && e.message || e) }; }
}

export { mergeEditions, parseEditionUrl, REGIONS };

// 원격 호를 기기에 저장하고 iframe에서 열 수 있는 주소를 돌려준다. 저장본이 있으면 네트워크를 쓰지 않는다.
const editionDownloads = createSingleFlight();
export function ensureEditionSrc(edition, options = {}) {
  return editionDownloads(`${edition.region || 'KR'}:${edition.date}`, () => loadEditionSrc(edition, options));
}
async function loadEditionSrc(edition, { frameSrc } = {}) {
  const path = editionFilePath(edition.date, edition.region || 'KR');
  const fs = frameSrc || new URL('frame.js', location.href).href;
  if (native()) {
    try { const st = await Filesystem.stat({ path, directory: Directory.Data }); if (st && st.uri) return Capacitor.convertFileSrc(st.uri); } catch {}
    const html = transformEditionHtml(await fetchText(edition.html), fs);
    const w = await Filesystem.writeFile({ path, directory: Directory.Data, data: html, encoding: Encoding.UTF8, recursive: true });
    return Capacitor.convertFileSrc(w.uri);
  }
  // 웹 미리보기: localStorage 캐시 + Blob URL (교차 출처라 뒤로가기·메시지 연동은 제한됨)
  const key = 'dailydrop.edition.' + edition.date; let html = null;
  try { html = localStorage.getItem(key); } catch {}
  if (!html) { html = transformEditionHtml(await fetchText(edition.html), fs); try { localStorage.setItem(key, html); } catch {} }
  return URL.createObjectURL(new Blob([html], { type: 'text/html' }));
}
export async function hasEditionFile(date) {
  if (native()) { try { await Filesystem.stat({ path: editionFilePath(date), directory: Directory.Data }); return true; } catch { return false; } }
  try { return !!localStorage.getItem('dailydrop.edition.' + date); } catch { return false; }
}
export async function removeEditionFile(date) {
  if (native()) { try { await Filesystem.deleteFile({ path: editionFilePath(date), directory: Directory.Data }); } catch {} return; }
  try { localStorage.removeItem('dailydrop.edition.' + date); } catch {}
}
async function fetchText(url) { const r = await fetch(url, { cache: 'no-store' }); if (!r.ok) throw new Error('download ' + r.status); return r.text(); }

// 푸시: 결과를 돌려준다({ok, state, error}). 네트워크 실패를 성공으로 보고하지 않는다.
// 빌드 플래그(esbuild define). 설정 없는 빌드에서는 register()를 절대 호출하지 않는다 — Firebase 미설정 시 네이티브 측 예외가 JS catch로 안 막힘(코덱스 지적).
export function pushConfigured() {
  const p = Capacitor.getPlatform();
  if (p === 'android') return typeof __PUSH_ANDROID__ !== 'undefined' && __PUSH_ANDROID__ === true;
  if (p === 'ios') return typeof __PUSH_IOS__ !== 'undefined' && __PUSH_IOS__ === true;
  return false;
}
export async function getPushState() { try { return (await readPreference(K_PUSH)).value === 'on' ? 'on' : 'off'; } catch { return 'off'; } }
export async function enablePush({ appVersion = '0.1.0', onOpenEdition } = {}) {
  if (!native() || !Capacitor.isPluginAvailable('PushNotifications')) return { ok: false, state: 'unsupported' };
  if (!pushConfigured()) return { ok: false, state: 'not-configured' };
  let perm = await PushNotifications.checkPermissions();
  if (perm.receive === 'prompt' || perm.receive === 'prompt-with-rationale') perm = await PushNotifications.requestPermissions();
  if (perm.receive !== 'granted') return { ok: false, state: 'denied' };
  const platform = Capacitor.getPlatform();
  const token = await new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error('registration timeout')), 15000);
    PushNotifications.addListener('registration', r => { clearTimeout(t); resolve(r.value); });
    PushNotifications.addListener('registrationError', e => { clearTimeout(t); reject(new Error(e && e.error || 'registration error')); });
    PushNotifications.register().catch(reject);
  });
  const r = await fetch(`${FEED}/push/register`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ token, platform, app_version: appVersion }) });
  if (!r.ok) return { ok: false, state: 'server-error', error: 'register ' + r.status };
  try { await Preferences.set({ key: K_PUSH, value: 'on' }); await Preferences.set({ key: K_TOKEN, value: token }); } catch {}
  PushNotifications.addListener('pushNotificationActionPerformed', a => { const d = (a && a.notification && a.notification.data) || {}; if (d.edition && onOpenEdition) onOpenEdition(String(d.edition)); });
  return { ok: true, state: 'on' };
}
// 끄기: 서버 해제가 성공했을 때만 토큰·상태를 지운다. 실패하면 상태 'on' 유지 → 사용자가 다시 시도할 수 있다.
export async function disablePush() {
  let token = null; try { token = (await readPreference(K_TOKEN)).value; } catch {}
  if (token) {
    try { const r = await fetch(`${FEED}/push/unregister`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ token }) }); if (!r.ok) return { ok: false, state: 'on', error: 'unregister ' + r.status }; }
    catch (e) { return { ok: false, state: 'on', error: String(e && e.message || e) }; }
  }
  try { await Preferences.set({ key: K_PUSH, value: 'off' }); await Preferences.remove({ key: K_TOKEN }); } catch {}
  return { ok: true, state: 'off' };
}
// 앱이 다시 열릴 때 알림 탭 처리를 다시 연결(권한·토큰은 이미 있음)
export function bindPushTap(onOpenEdition) {
  if (!native() || !Capacitor.isPluginAvailable('PushNotifications') || !pushConfigured()) return;
  PushNotifications.addListener('pushNotificationActionPerformed', a => { const d = (a && a.notification && a.notification.data) || {}; if (d.edition) onOpenEdition(String(d.edition)); });
}

// 딥링크: https://dailydrop.kr/YYYY-MM-DD/ 또는 루트
export async function bindDeepLinks(onEdition) {
  if (!native()) return;
  const handle = url => { const d = parseEditionUrl(url); if (d) onEdition(d); };
  App.addListener('appUrlOpen', e => handle(e.url));
  try { const l = await App.getLaunchUrl(); if (l && l.url) handle(l.url); } catch {}
}
