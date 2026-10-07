// 데일리드롭 앱 공용 모듈 (Capacitor 8 기준, 프레임워크 무관 ES 모듈)
// 역할: ① editions.json 폴링으로 새 호 감지 ② 호 HTML 오프라인 저장 ③ 푸시 토큰 등록/해제 ④ 딥링크(https://dailydrop.kr/YYYY-MM-DD/) → 호 열기
// 사용: import { DailyDrop } from './dailydrop-app.js'; const dd = new DailyDrop({ onOpenEdition }); await dd.start();
// 의존(선택): @capacitor/preferences, @capacitor/filesystem, @capacitor/push-notifications, @capacitor/app — 없으면 localStorage/무시로 폴백.

const SITE = 'https://dailydrop.kr';
const FEED = 'https://feed.dailydrop.kr';
const INDEX_URL = SITE + '/editions.json';
const POLL_MS = 30 * 60 * 1000;

const mod = async (name) => { try { return await import(/* @vite-ignore */ name); } catch (e) { return null; } };

class KV {
  constructor() { this.p = null; }
  async init() { const m = await mod('@capacitor/preferences'); this.p = m && m.Preferences; }
  async get(k) { if (this.p) { const r = await this.p.get({ key: k }); return r.value; } try { return localStorage.getItem(k); } catch (e) { return null; } }
  async set(k, v) { if (this.p) return this.p.set({ key: k, value: v }); try { localStorage.setItem(k, v); } catch (e) {} }
  async del(k) { if (this.p) return this.p.remove({ key: k }); try { localStorage.removeItem(k); } catch (e) {} }
}

class Store { // 호 HTML 저장: Filesystem(Data 디렉터리) → 없으면 KV
  constructor(kv) { this.kv = kv; this.fs = null; }
  async init() { const m = await mod('@capacitor/filesystem'); if (m) { this.fs = m.Filesystem; this.dir = m.Directory.Data; this.enc = m.Encoding.UTF8; } }
  key(date) { return 'edition:' + date; }
  async save(date, html) { if (this.fs) return this.fs.writeFile({ path: 'editions/' + date + '.html', data: html, directory: this.dir, encoding: this.enc, recursive: true }); return this.kv.set(this.key(date), html); }
  async load(date) { try { if (this.fs) { const r = await this.fs.readFile({ path: 'editions/' + date + '.html', directory: this.dir, encoding: this.enc }); return r.data; } return await this.kv.get(this.key(date)); } catch (e) { return null; } }
  async remove(date) { try { if (this.fs) return await this.fs.deleteFile({ path: 'editions/' + date + '.html', directory: this.dir }); return await this.kv.del(this.key(date)); } catch (e) {} }
}

export class DailyDrop {
  constructor(opts = {}) {
    this.onOpenEdition = opts.onOpenEdition || (() => {});   // (date, html) → 화면에 표시
    this.onIndex = opts.onIndex || (() => {});               // (index) → 목록 갱신
    this.onPushState = opts.onPushState || (() => {});       // ('granted'|'denied'|'unsupported'|'off')
    this.appVersion = opts.appVersion || '1.0.0';
    this.kv = new KV(); this.store = new Store(this.kv); this.index = null; this.timer = null;
  }
  async start() {
    await this.kv.init(); await this.store.init();
    const cached = await this.kv.get('index'); if (cached) { try { this.index = JSON.parse(cached); this.onIndex(this.index); } catch (e) {} }
    await this.refresh();
    this.timer = setInterval(() => this.refresh().catch(() => {}), POLL_MS);
    await this.bindDeepLinks();
    if (await this.kv.get('push') === 'on') this.enablePush().catch(() => {});
    return this.index;
  }
  stop() { if (this.timer) clearInterval(this.timer); }

  // ① 새 호 감지: latest가 바뀌면 그 호 HTML을 받아 저장. 지난 호는 요청 시(openEdition) 받아 저장.
  async refresh() {
    const r = await fetch(INDEX_URL, { cache: 'no-store' }); if (!r.ok) throw new Error('index ' + r.status);
    const idx = await r.json(); const prev = this.index && this.index.latest;
    this.index = idx; await this.kv.set('index', JSON.stringify(idx)); this.onIndex(idx);
    if (idx.latest && idx.latest !== prev) { await this.fetchEdition(idx.latest).catch(() => {}); }
    return idx;
  }
  async fetchEdition(date) {
    const e = (this.index && this.index.editions || []).find(x => x.date === date); if (!e) return null;
    const r = await fetch(e.html, { cache: 'no-store' }); if (!r.ok) throw new Error('edition ' + r.status);
    const html = await r.text(); await this.store.save(date, html); return html;
  }
  // ② 열기: 저장본 우선, 없으면 네트워크
  async openEdition(date) {
    let html = await this.store.load(date);
    if (!html) html = await this.fetchEdition(date);
    if (html) this.onOpenEdition(date, html);
    return !!html;
  }
  async isSaved(date) { return !!(await this.store.load(date)); }
  async removeEdition(date) { return this.store.remove(date); }

  // ③ 푸시: 권한 → 토큰 → Worker 등록. 끄면 해제.
  async enablePush() {
    const m = await mod('@capacitor/push-notifications'); if (!m) { this.onPushState('unsupported'); return false; }
    const PN = m.PushNotifications; let perm = await PN.checkPermissions();
    if (perm.receive === 'prompt' || perm.receive === 'prompt-with-rationale') perm = await PN.requestPermissions();
    if (perm.receive !== 'granted') { this.onPushState('denied'); return false; }
    const platform = (await this.platform());
    PN.addListener('registration', async (t) => {
      await this.kv.set('push', 'on'); await this.kv.set('pushToken', t.value);
      await fetch(FEED + '/push/register', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ token: t.value, platform, app_version: this.appVersion }) }).catch(() => {});
      this.onPushState('granted');
    });
    PN.addListener('pushNotificationActionPerformed', (a) => { const d = a.notification && a.notification.data || {}; if (d.edition) this.openEdition(d.edition).catch(() => {}); });
    await PN.register(); return true;
  }
  async disablePush() {
    const tok = await this.kv.get('pushToken');
    if (tok) await fetch(FEED + '/push/unregister', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ token: tok }) }).catch(() => {});
    await this.kv.set('push', 'off'); await this.kv.del('pushToken'); this.onPushState('off');
  }
  async platform() { const m = await mod('@capacitor/core'); try { return m ? m.Capacitor.getPlatform() : 'web'; } catch (e) { return 'web'; } }

  // ④ 딥링크: https://dailydrop.kr/2026-10-07/ → openEdition('2026-10-07'); 루트는 최신호
  async bindDeepLinks() {
    const m = await mod('@capacitor/app'); if (!m) return;
    const handle = (url) => { const d = this.parseEditionUrl(url); if (d) this.openEdition(d).catch(() => {}); };
    m.App.addListener('appUrlOpen', (e) => handle(e.url));
    try { const l = await m.App.getLaunchUrl(); if (l && l.url) handle(l.url); } catch (e) {}
  }
  parseEditionUrl(url) {
    try { const u = new URL(url); if (!/(^|\.)dailydrop\.kr$/.test(u.hostname)) return null; const m = u.pathname.match(/^\/(\d{4}-\d{2}-\d{2})\/?/); if (m) return m[1]; if (u.pathname === '/' || u.pathname === '') return this.index && this.index.latest || null; return null; } catch (e) { return null; }
  }
}
