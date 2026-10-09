// 데일리드롭 회원·북마크·방문 통계 API (D1 바인딩 UDB). index.js 가 /api/* 중 아래 경로를 여기로 넘긴다.
//  POST /api/auth/google {credential}         Google ID 토큰(GIS) 검증 → 로그인/가입
//  POST /api/auth/signup {email,password,name} 이메일 가입(PBKDF2-SHA256)
//  POST /api/auth/login  {email,password}      이메일 로그인
//  POST /api/auth/logout                       세션 삭제
//  POST /api/auth/email/send · /verify {code}  6자리 인증 코드(Resend 키가 있을 때만)
//  GET  /api/auth/config                       {google: 클라이언트 ID|null, verify: bool}
//  GET  /api/me · DELETE /api/me {confirm:true} 내 정보 · 탈퇴(회원·세션·북마크 삭제)
//  GET/POST/DELETE /api/bookmarks              기사·용어 북마크
//  POST /api/hit                               방문 비콘(DNT/GPC·봇 제외는 페이지·여기 양쪽)
//  GET  /api/admin/stats?range=7|30|90         관리자 대시보드 데이터(ADMIN_EMAILS + 이메일 인증된 계정만)
// 비밀값(GOOGLE_CLIENT_ID·ADMIN_EMAILS·RESEND_API_KEY·MAIL_FROM·HIT_SALT)은 wrangler secret/vars 로만 넣는다. 비밀번호·토큰은 로그에 남기지 않는다.

const SID = 'dd_sid', HINT = 'dd_in';
const SESSION_DAYS = 30, PBKDF2_ITER = 100000, RL_MAX = 10, RL_WIN = 15 * 60 * 1000;
const KST = 9 * 3600 * 1000; // 통계의 '하루'·시간 축은 한국 시간 기준
const APP_ORIGINS = new Set(['capacitor://localhost', 'http://localhost', 'https://localhost', 'ionic://localhost']);
const BOT = /bot|crawl|spider|slurp|facebookexternalhit|embedly|preview|monitor|curl|wget|python|httpclient|java\/|go-http|okhttp|axios|node-fetch|headless|lighthouse|pingdom|uptime/i;
const enc = new TextEncoder();

const json = (obj, status = 200, headers = {}) => new Response(JSON.stringify(obj), { status, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', ...headers } });
const err = (status, error, extra = {}) => json({ ok: false, error, ...extra }, status);
const b64u = buf => btoa(String.fromCharCode(...new Uint8Array(buf))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const b64 = buf => btoa(String.fromCharCode(...new Uint8Array(buf)));
const unb64 = s => Uint8Array.from(atob(s), c => c.charCodeAt(0));
const unb64u = s => unb64(s.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((s.length + 3) % 4));
const hex = buf => [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, '0')).join('');
const sha256 = async s => hex(await crypto.subtle.digest('SHA-256', enc.encode(s)));
const rand = n => crypto.getRandomValues(new Uint8Array(n));
const ip = req => req.headers.get('cf-connecting-ip') || req.headers.get('x-real-ip') || '0.0.0.0';
const kday = ts => new Date(ts + KST).toISOString().slice(0, 10);
const cookieOf = (req, k) => { const m = (req.headers.get('cookie') || '').match(new RegExp('(?:^|;\\s*)' + k + '=([^;]+)')); return m ? m[1] : null; };
const isEmail = s => typeof s === 'string' && s.length <= 254 && /^[^\s@<>"]+@[^\s@<>"]+\.[^\s@<>"]+$/.test(s);
const str = (v, max) => (typeof v === 'string' ? v : '').trim().slice(0, max);
// 상수 시간 비교(같은 길이 hex/base64 문자열)
const same = (a, b) => { if (typeof a !== 'string' || typeof b !== 'string' || a.length !== b.length) return false; let d = 0; for (let i = 0; i < a.length; i++) d |= a.charCodeAt(i) ^ b.charCodeAt(i); return d === 0; };

async function body(req, max = 4096) { const t = await req.text(); if (t.length > max) return null; try { const j = JSON.parse(t || '{}'); return j && typeof j === 'object' ? j : null; } catch (e) { return null; } }

// CSRF: 상태를 바꾸는 요청은 Origin 이 이 사이트(요청 호스트)와 같아야 한다.
function sameOrigin(req, url) { const o = req.headers.get('origin'); if (!o) return false; try { return new URL(o).host === url.host; } catch (e) { return false; } }

// ── 비밀번호: PBKDF2-SHA256, 16바이트 무작위 salt
async function pbkdf2(pw, saltBytes, iter) {
  const key = await crypto.subtle.importKey('raw', enc.encode(pw), 'PBKDF2', false, ['deriveBits']);
  return b64(await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt: saltBytes, iterations: iter }, key, 256));
}
const DUMMY_SALT = new Uint8Array(16);

// ── 세션: 32바이트 토큰을 쿠키로, DB엔 SHA-256 만
async function newSession(env, req, userId) {
  const token = b64u(rand(32)); const now = Date.now();
  await env.UDB.prepare('INSERT INTO sessions (token_hash, user_id, created_at, expires_at, ua) VALUES (?, ?, ?, ?, ?)').bind(await sha256(token), userId, now, now + SESSION_DAYS * 864e5, str(req.headers.get('user-agent'), 200)).run();
  const age = SESSION_DAYS * 86400;
  return [`${SID}=${token}; Path=/; Max-Age=${age}; HttpOnly; Secure; SameSite=Lax`, `${HINT}=1; Path=/; Max-Age=${age}; Secure; SameSite=Lax`];
}
const clearCookies = () => [`${SID}=; Path=/; Max-Age=0; HttpOnly; Secure; SameSite=Lax`, `${HINT}=; Path=/; Max-Age=0; Secure; SameSite=Lax`];
const withCookies = (res, cookies) => { for (const c of cookies) res.headers.append('set-cookie', c); return res; };

async function currentUser(env, req) {
  const t = cookieOf(req, SID); if (!t || t.length > 100) return null;
  const row = await env.UDB.prepare('SELECT u.*, s.token_hash AS sid_hash, s.expires_at AS sid_exp FROM sessions s JOIN users u ON u.id = s.user_id WHERE s.token_hash = ?').bind(await sha256(t)).first();
  if (!row) return null;
  if (row.sid_exp < Date.now()) { await env.UDB.prepare('DELETE FROM sessions WHERE token_hash = ?').bind(row.sid_hash).run(); return null; }
  return row;
}
const adminList = env => String(env.ADMIN_EMAILS || '').toLowerCase().split(/[,\s]+/).filter(Boolean);
// 관리자: ADMIN_EMAILS 목록에 있고 이메일이 인증된 계정(아무나 그 주소로 이메일 가입해 관리자가 되는 것을 막음)
const isAdmin = (env, u) => !!u && u.email_verified === 1 && adminList(env).includes(String(u.email).toLowerCase());
// 발송 경로: Cloudflare Email Service 바인딩(EMAIL, MAIL_LIVE='1' 일 때) 우선, 없으면 Resend 키
const cfMail = env => !!(env.EMAIL && env.MAIL_LIVE === '1' && env.MAIL_FROM);
const verifyOn = env => cfMail(env) || !!(env.RESEND_API_KEY && env.MAIL_FROM);
const publicUser = (env, u) => ({ id: u.id, email: u.email, name: u.name || '', method: u.google_sub && u.pw_hash ? 'both' : u.google_sub ? 'google' : 'email', verified: u.email_verified === 1, admin: isAdmin(env, u), created_at: u.created_at });

async function afterLogin(env, req, u) {
  const role = isAdmin(env, u) ? 'admin' : 'member';
  await env.UDB.prepare('UPDATE users SET last_login_at = ?, role = ? WHERE id = ?').bind(Date.now(), role, u.id).run();
  // 오래된 세션 정리(가끔)
  if (Math.random() < 0.05) await env.UDB.prepare('DELETE FROM sessions WHERE expires_at < ?').bind(Date.now()).run();
  const cookies = await newSession(env, req, u.id);
  return withCookies(json({ ok: true, user: publicUser(env, { ...u, role }), verify: verifyOn(env) }), cookies);
}

// ── 속도 제한: IP(해시)당 15분에 10회
async function limited(env, req) {
  const h = await sha256('rl:' + ip(req) + ':' + (env.HIT_SALT || 'dailydrop')); const now = Date.now();
  const r = await env.UDB.prepare('SELECT COUNT(*) AS n FROM auth_attempts WHERE ip_hash = ? AND ts > ?').bind(h, now - RL_WIN).first();
  if ((r && r.n) >= RL_MAX) return true;
  await env.UDB.prepare('INSERT INTO auth_attempts (ip_hash, ts) VALUES (?, ?)').bind(h, now).run();
  if (Math.random() < 0.02) await env.UDB.prepare('DELETE FROM auth_attempts WHERE ts < ?').bind(now - 864e5).run();
  return false;
}

// ── Google ID 토큰(RS256) 검증: JWKS 1시간 캐시
let JWKS = null, JWKS_AT = 0;
async function googleKeys(force) {
  if (!force && JWKS && Date.now() - JWKS_AT < 3600e3) return JWKS;
  const r = await fetch('https://www.googleapis.com/oauth2/v3/certs', { cf: { cacheTtl: 3600, cacheEverything: true } });
  if (!r.ok) throw new Error('jwks ' + r.status);
  JWKS = (await r.json()).keys || []; JWKS_AT = Date.now(); return JWKS;
}
export async function verifyGoogleToken(jwt, clientId, keysFn = googleKeys) {
  const parts = String(jwt || '').split('.'); if (parts.length !== 3 || jwt.length > 4096) return null;
  let header, payload; try { header = JSON.parse(new TextDecoder().decode(unb64u(parts[0]))); payload = JSON.parse(new TextDecoder().decode(unb64u(parts[1]))); } catch (e) { return null; }
  if (header.alg !== 'RS256' || !header.kid) return null;
  let jwk = (await keysFn(false)).find(k => k.kid === header.kid); if (!jwk) jwk = (await keysFn(true)).find(k => k.kid === header.kid); if (!jwk) return null;
  const key = await crypto.subtle.importKey('jwk', { kty: jwk.kty, n: jwk.n, e: jwk.e, alg: 'RS256', ext: true }, { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['verify']);
  const ok = await crypto.subtle.verify('RSASSA-PKCS1-v1_5', key, unb64u(parts[2]), enc.encode(parts[0] + '.' + parts[1]));
  if (!ok) return null;
  const now = Math.floor(Date.now() / 1000);
  if (!['accounts.google.com', 'https://accounts.google.com'].includes(payload.iss)) return null;
  if (payload.aud !== clientId) return null;
  if (!(payload.exp > now - 60) || (payload.iat && payload.iat > now + 300)) return null;
  if (!(payload.email_verified === true || payload.email_verified === 'true') || !isEmail(payload.email) || !payload.sub) return null;
  return payload;
}

// ── 메일: Cloudflare Email Service 바인딩 또는 Resend 키가 있을 때만
async function sendCode(env, email) {
  const code = String(100000 + (new Uint32Array(rand(4).buffer)[0] % 900000));
  await env.UDB.prepare('INSERT INTO email_codes (email, code_hash, expires_at, tries) VALUES (?, ?, ?, 0) ON CONFLICT(email) DO UPDATE SET code_hash = excluded.code_hash, expires_at = excluded.expires_at, tries = 0').bind(email, await sha256('code:' + email + ':' + code), Date.now() + 15 * 60e3).run();
  const subject = `DailyDrop 인증 코드 ${code} · verification code`, text = `데일리드롭 인증 코드: ${code}\n15분 동안 유효합니다. 직접 요청하지 않았다면 이 메일은 무시하세요.\n\nYour DailyDrop verification code: ${code} (valid for 15 minutes).`;
  if (cfMail(env)) { const m = /^\s*(.*?)\s*<([^>]+)>\s*$/.exec(env.MAIL_FROM); await env.EMAIL.send({ from: m ? { email: m[2], name: m[1] || 'DailyDrop' } : env.MAIL_FROM, to: email, subject, text }); return true; }
  const r = await fetch('https://api.resend.com/emails', { method: 'POST', headers: { authorization: 'Bearer ' + env.RESEND_API_KEY, 'content-type': 'application/json' }, body: JSON.stringify({ from: env.MAIL_FROM, to: [email], subject, text }) });
  return r.ok;
}

// ── 라우터
export async function handleAccount(request, env, url, ctx) {
  const p = url.pathname, m = request.method;
  if (p === '/api/hit') return hit(request, env, url, ctx);
  if (!env.UDB) return err(503, 'unavailable');
  const isWrite = m !== 'GET' && m !== 'HEAD';
  if (isWrite && !sameOrigin(request, url)) return err(403, 'forbidden');
  try {
    if (p === '/api/auth/config' && m === 'GET') return json({ google: env.GOOGLE_CLIENT_ID || null, verify: verifyOn(env) });
    if (p === '/api/me') {
      const u = await currentUser(env, request);
      if (m === 'GET') return u ? json({ user: publicUser(env, u), verify: verifyOn(env) }) : withCookies(json({ user: null }), request.headers.get('cookie') && cookieOf(request, HINT) ? clearCookies() : []);
      if (m === 'DELETE') {
        if (!u) return err(401, 'auth');
        const b = await body(request); if (!b || b.confirm !== true) return err(400, 'confirm');
        await env.UDB.batch([
          env.UDB.prepare('DELETE FROM bookmarks WHERE user_id = ?').bind(u.id),
          env.UDB.prepare('DELETE FROM sessions WHERE user_id = ?').bind(u.id),
          env.UDB.prepare('DELETE FROM email_codes WHERE email = ?').bind(u.email),
          env.UDB.prepare('UPDATE pageviews SET user_id = NULL WHERE user_id = ?').bind(u.id),
          env.UDB.prepare('DELETE FROM users WHERE id = ?').bind(u.id),
        ]);
        return withCookies(json({ ok: true }), clearCookies());
      }
      return err(405, 'method');
    }
    if (p === '/api/auth/logout' && m === 'POST') {
      const t = cookieOf(request, SID); if (t && t.length <= 100) await env.UDB.prepare('DELETE FROM sessions WHERE token_hash = ?').bind(await sha256(t)).run();
      return withCookies(json({ ok: true }), clearCookies());
    }
    if (p === '/api/auth/signup' && m === 'POST') {
      const b = await body(request); if (!b) return err(400, 'bad_request');
      const email = str(b.email, 254).toLowerCase(), pw = typeof b.password === 'string' ? b.password : '', name = str(b.name, 60);
      if (!isEmail(email)) return err(400, 'email');
      if (pw.length < 8 || pw.length > 200) return err(400, 'password');
      if (await limited(env, request)) return err(429, 'rate');
      const exists = await env.UDB.prepare('SELECT id FROM users WHERE email = ?').bind(email).first();
      // 계정 존재 여부를 드러내지 않는 문구(이미 있으면 로그인 안내 — 같은 오류 코드)
      if (exists) return err(409, 'signup_failed');
      const salt = rand(16); const hash = await pbkdf2(pw, salt, PBKDF2_ITER); const now = Date.now();
      const r = await env.UDB.prepare('INSERT INTO users (email, name, pw_hash, pw_salt, pw_iter, email_verified, role, created_at) VALUES (?, ?, ?, ?, ?, 0, ?, ?) RETURNING *').bind(email, name || null, hash, b64(salt), PBKDF2_ITER, 'member', now).first();
      if (verifyOn(env)) { try { await sendCode(env, email); } catch (e) { } }
      return afterLogin(env, request, r);
    }
    if (p === '/api/auth/login' && m === 'POST') {
      const b = await body(request); if (!b) return err(400, 'bad_request');
      const email = str(b.email, 254).toLowerCase(), pw = typeof b.password === 'string' ? b.password.slice(0, 200) : '';
      if (await limited(env, request)) return err(429, 'rate');
      const u = isEmail(email) ? await env.UDB.prepare('SELECT * FROM users WHERE email = ?').bind(email).first() : null;
      // 계정이 없어도 같은 시간만큼 계산(응답 시간으로 가입 여부를 알 수 없게)
      const h = await pbkdf2(pw, u && u.pw_salt ? unb64(u.pw_salt) : DUMMY_SALT, (u && u.pw_iter) || PBKDF2_ITER);
      if (!u || !u.pw_hash || !same(h, u.pw_hash)) return err(401, 'invalid_login');
      return afterLogin(env, request, u);
    }
    if (p === '/api/auth/google' && m === 'POST') {
      if (!env.GOOGLE_CLIENT_ID) return err(503, 'google_off');
      const b = await body(request, 8192); if (!b) return err(400, 'bad_request');
      if (await limited(env, request)) return err(429, 'rate');
      let g; try { g = await verifyGoogleToken(str(b.credential, 4096), env.GOOGLE_CLIENT_ID); } catch (e) { return err(502, 'google_unreachable'); }
      if (!g) return err(401, 'google_invalid');
      const email = String(g.email).toLowerCase(), now = Date.now();
      let u = await env.UDB.prepare('SELECT * FROM users WHERE google_sub = ?').bind(g.sub).first();
      if (!u) {
        const byEmail = await env.UDB.prepare('SELECT * FROM users WHERE email = ?').bind(email).first();
        if (byEmail) {
          if (byEmail.google_sub) return err(409, 'google_conflict');
          // 같은 이메일의 기존 계정에 Google을 연결. 미인증 이메일 가입이었다면(남이 먼저 그 주소로 가입했을 수 있음) 비밀번호·세션을 무효화한다.
          const stmts = [env.UDB.prepare('UPDATE users SET google_sub = ?, email_verified = 1, name = COALESCE(name, ?)' + (byEmail.email_verified ? '' : ', pw_hash = NULL, pw_salt = NULL') + ' WHERE id = ?').bind(g.sub, str(g.name, 60) || null, byEmail.id)];
          if (!byEmail.email_verified) stmts.push(env.UDB.prepare('DELETE FROM sessions WHERE user_id = ?').bind(byEmail.id));
          await env.UDB.batch(stmts);
          u = await env.UDB.prepare('SELECT * FROM users WHERE id = ?').bind(byEmail.id).first();
        } else {
          u = await env.UDB.prepare('INSERT INTO users (email, name, google_sub, email_verified, role, created_at) VALUES (?, ?, ?, 1, ?, ?) RETURNING *').bind(email, str(g.name, 60) || null, g.sub, 'member', now).first();
        }
      }
      return afterLogin(env, request, u);
    }
    if (p === '/api/auth/email/send' && m === 'POST') {
      const u = await currentUser(env, request); if (!u) return err(401, 'auth');
      if (!verifyOn(env)) return json({ ok: false, disabled: true });
      if (u.email_verified) return json({ ok: true, verified: true });
      if (await limited(env, request)) return err(429, 'rate');
      let ok = false; try { ok = await sendCode(env, u.email); } catch (e) { }
      return ok ? json({ ok: true }) : err(502, 'mail_failed');
    }
    if (p === '/api/auth/email/verify' && m === 'POST') {
      const u = await currentUser(env, request); if (!u) return err(401, 'auth');
      const b = await body(request); const code = str(b && b.code, 12).replace(/\D/g, '');
      if (await limited(env, request)) return err(429, 'rate');
      const row = await env.UDB.prepare('SELECT * FROM email_codes WHERE email = ?').bind(u.email).first();
      if (!row || row.expires_at < Date.now() || row.tries >= 5) return err(400, 'code_expired');
      if (!same(await sha256('code:' + u.email + ':' + code), row.code_hash)) { await env.UDB.prepare('UPDATE email_codes SET tries = tries + 1 WHERE email = ?').bind(u.email).run(); return err(400, 'code_wrong'); }
      await env.UDB.batch([env.UDB.prepare('UPDATE users SET email_verified = 1 WHERE id = ?').bind(u.id), env.UDB.prepare('DELETE FROM email_codes WHERE email = ?').bind(u.email)]);
      return json({ ok: true, user: publicUser(env, { ...u, email_verified: 1 }) });
    }
    if (p === '/api/bookmarks') return bookmarks(request, env, url);
    if (p === '/api/admin/stats' && m === 'GET') {
      const u = await currentUser(env, request);
      if (!u) return err(401, 'auth');
      if (!isAdmin(env, u)) return err(403, 'admin_only');
      return json(await stats(env, url));
    }
    return err(404, 'not_found');
  } catch (e) {
    console.error('account api error', p, e && e.message); // 요청 본문(비밀번호·토큰)은 남기지 않음
    return err(500, 'server');
  }
}

// ── 북마크
const RE_REGION = /^[A-Z]{2}$/, RE_DATE = /^\d{4}-\d{2}-\d{2}$/, RE_LANG = /^[A-Za-z]{2,3}(-[A-Za-z]{2,4})?$/;
async function bookmarks(req, env, url) {
  const u = await currentUser(env, req); if (!u) return err(401, 'auth');
  const m = req.method;
  if (m === 'GET') {
    const kind = url.searchParams.get('kind');
    const q = kind === 'article' || kind === 'term' ? env.UDB.prepare('SELECT id, kind, region, date, lang, ref, title, url, note, created_at FROM bookmarks WHERE user_id = ? AND kind = ? ORDER BY created_at DESC LIMIT 2000').bind(u.id, kind) : env.UDB.prepare('SELECT id, kind, region, date, lang, ref, title, url, note, created_at FROM bookmarks WHERE user_id = ? ORDER BY created_at DESC LIMIT 2000').bind(u.id);
    return json({ items: (await q.all()).results || [] });
  }
  const b = await body(req); if (!b) return err(400, 'bad_request');
  if (m === 'DELETE' && Number.isInteger(b.id)) { await env.UDB.prepare('DELETE FROM bookmarks WHERE id = ? AND user_id = ?').bind(b.id, u.id).run(); return json({ ok: true }); }
  const kind = b.kind === 'term' ? 'term' : b.kind === 'article' ? 'article' : null; if (!kind) return err(400, 'kind');
  const region = RE_REGION.test(b.region || '') ? b.region : (kind === 'term' ? '' : null), date = RE_DATE.test(b.date || '') ? b.date : (kind === 'term' ? '' : null);
  const ref = str(b.ref, 120);
  if (m === 'DELETE') {
    if (!ref) return err(400, 'ref');
    if (kind === 'term') await env.UDB.prepare("DELETE FROM bookmarks WHERE user_id = ? AND kind = 'term' AND ref = ?").bind(u.id, ref).run();
    else { if (region == null || date == null) return err(400, 'edition'); await env.UDB.prepare("DELETE FROM bookmarks WHERE user_id = ? AND kind = 'article' AND region = ? AND date = ? AND ref = ?").bind(u.id, region, date, ref).run(); }
    return json({ ok: true });
  }
  if (m === 'POST') {
    if (!ref || region == null || date == null) return err(400, 'bad_bookmark');
    const lang = RE_LANG.test(b.lang || '') ? b.lang : '';
    let link = str(b.url, 300); if (!/^\/(?!\/)[^\s"'<>\\]*$/.test(link)) link = '';
    const n = await env.UDB.prepare('SELECT COUNT(*) AS n FROM bookmarks WHERE user_id = ?').bind(u.id).first();
    if (n && n.n >= 2000) return err(400, 'too_many');
    if (kind === 'term' && await env.UDB.prepare("SELECT 1 AS x FROM bookmarks WHERE user_id = ? AND kind = 'term' AND ref = ?").bind(u.id, ref).first()) return json({ ok: true });
    await env.UDB.prepare('INSERT OR IGNORE INTO bookmarks (user_id, kind, region, date, lang, ref, title, url, note, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)').bind(u.id, kind, region, date, lang, ref, str(b.title, 300) || ref, link || null, str(b.note, 400) || null, Date.now()).run();
    return json({ ok: true });
  }
  return err(405, 'method');
}

// ── 방문 비콘: IP 원문은 저장하지 않고 (날짜+IP+UA+salt) 해시만
const device = ua => /iPad|Tablet|PlayBook|Silk|(Android(?!.*Mobile))/i.test(ua) ? 'tablet' : /Mobi|iPhone|iPod|Android|Opera Mini|IEMobile/i.test(ua) ? 'mobile' : 'desktop';
async function hit(req, env, url, ctx) {
  const origin = req.headers.get('origin') || '';
  const cors = APP_ORIGINS.has(origin) ? { 'access-control-allow-origin': origin, 'access-control-allow-methods': 'POST', 'access-control-allow-headers': 'content-type', vary: 'origin' } : {};
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });
  if (req.method !== 'POST') return err(405, 'method');
  if (!sameOrigin(req, url) && !APP_ORIGINS.has(origin)) return err(403, 'forbidden');
  const none = new Response(null, { status: 204, headers: cors });
  const ua = req.headers.get('user-agent') || '';
  if (!env.UDB || !ua || BOT.test(ua) || req.headers.get('dnt') === '1' || req.headers.get('sec-gpc') === '1') return none;
  const b = await body(req, 1024); if (!b) return none;
  const path = str(b.path, 200); if (!path.startsWith('/')) return none;
  let refHost = ''; try { const r = new URL(str(b.ref, 300)); if (/^https?:$/.test(r.protocol) && r.host !== url.host) refHost = r.hostname.replace(/^www\./, '').slice(0, 100); } catch (e) { }
  const now = Date.now(), day = kday(now);
  const client = b.client === 'app' || APP_ORIGINS.has(origin) || /DailyDropApp/.test(ua) ? 'app' : 'web';
  const country = ((req.cf && req.cf.country) || '').toUpperCase().slice(0, 2) || null;
  const vid = (await sha256(day + '|' + ip(req) + '|' + ua + '|' + (env.HIT_SALT || 'dailydrop-hit'))).slice(0, 32);
  const work = (async () => {
    let uid = null; if (cookieOf(req, HINT)) { try { const u = await currentUser(env, req); uid = u ? u.id : null; } catch (e) { } }
    await env.UDB.prepare('INSERT INTO pageviews (ts, day, path, region, lang, ref_host, device, client, country, vid_hash, user_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)').bind(now, day, path, RE_REGION.test(b.region || '') ? b.region : null, RE_LANG.test(b.lang || '') ? b.lang : null, refHost || null, device(ua), client, country, vid, uid).run();
  })().catch(e => console.error('hit', e && e.message));
  if (ctx && ctx.waitUntil) ctx.waitUntil(work); else await work;
  return none;
}

// ── 관리자 통계
async function stats(env, url) {
  const range = Math.min(90, Math.max(7, parseInt(url.searchParams.get('range'), 10) || 30));
  const now = Date.now(), today = kday(now);
  const dayAdd = (d, n) => new Date(Date.parse(d + 'T00:00:00Z') + n * 864e5).toISOString().slice(0, 10);
  const from = dayAdd(today, -(range - 1)), from2 = dayAdd(today, -(2 * range - 1));
  const D = env.UDB;
  const all = (sql, ...a) => D.prepare(sql).bind(...a).all().then(r => r.results || []);
  const one = (sql, ...a) => D.prepare(sql).bind(...a).first();
  const period = async (a, b) => one('SELECT COUNT(*) AS pv, COUNT(DISTINCT vid_hash) AS uv FROM pageviews WHERE day >= ? AND day <= ?', a, b);
  const [t0, t1, w0, w1, m0, m1, daily, hourly, regions, langs, clients, devices, pages, refs, countries, members, signups, bmk, topArt, topTerm, verified, google, active] = await Promise.all([
    period(today, today), period(dayAdd(today, -1), dayAdd(today, -1)),
    period(dayAdd(today, -6), today), period(dayAdd(today, -13), dayAdd(today, -7)),
    period(dayAdd(today, -29), today), period(dayAdd(today, -59), dayAdd(today, -30)),
    all('SELECT day, COUNT(*) AS pv, COUNT(DISTINCT vid_hash) AS uv FROM pageviews WHERE day >= ? GROUP BY day ORDER BY day', from),
    all('SELECT CAST((ts + ?) / 3600000 AS INTEGER) AS h, COUNT(*) AS pv, COUNT(DISTINCT vid_hash) AS uv FROM pageviews WHERE ts >= ? GROUP BY h ORDER BY h', KST, now - 48 * 3600e3),
    all("SELECT COALESCE(region, '-') AS k, COUNT(*) AS pv, COUNT(DISTINCT vid_hash) AS uv FROM pageviews WHERE day >= ? GROUP BY k ORDER BY pv DESC LIMIT 40", from),
    all("SELECT COALESCE(lang, '-') AS k, COUNT(*) AS pv, COUNT(DISTINCT vid_hash) AS uv FROM pageviews WHERE day >= ? GROUP BY k ORDER BY pv DESC LIMIT 30", from),
    all("SELECT COALESCE(client, 'web') AS k, COUNT(*) AS pv, COUNT(DISTINCT vid_hash) AS uv FROM pageviews WHERE day >= ? GROUP BY k ORDER BY pv DESC", from),
    all("SELECT COALESCE(device, '-') AS k, COUNT(*) AS pv, COUNT(DISTINCT vid_hash) AS uv FROM pageviews WHERE day >= ? GROUP BY k ORDER BY pv DESC", from),
    all('SELECT path AS k, COUNT(*) AS pv, COUNT(DISTINCT vid_hash) AS uv FROM pageviews WHERE day >= ? GROUP BY path ORDER BY pv DESC LIMIT 25', from),
    all("SELECT COALESCE(ref_host, '(직접)') AS k, COUNT(*) AS pv, COUNT(DISTINCT vid_hash) AS uv FROM pageviews WHERE day >= ? GROUP BY k ORDER BY pv DESC LIMIT 20", from),
    all("SELECT COALESCE(country, '-') AS k, COUNT(*) AS pv, COUNT(DISTINCT vid_hash) AS uv FROM pageviews WHERE day >= ? GROUP BY k ORDER BY pv DESC LIMIT 30", from),
    one('SELECT COUNT(*) AS n FROM users'),
    all('SELECT day, COUNT(*) AS n FROM (SELECT date((created_at + ?) / 1000, \'unixepoch\') AS day FROM users WHERE created_at >= ?) GROUP BY day ORDER BY day', KST, Date.parse(from2 + 'T00:00:00Z') - KST),
    all('SELECT kind AS k, COUNT(*) AS n, COUNT(DISTINCT user_id) AS users FROM bookmarks GROUP BY kind'),
    all("SELECT region, date, ref, MAX(title) AS title, MAX(url) AS url, COUNT(*) AS n FROM bookmarks WHERE kind = 'article' GROUP BY region, date, ref ORDER BY n DESC, MAX(created_at) DESC LIMIT 15"),
    all("SELECT ref, MAX(note) AS note, COUNT(*) AS n FROM bookmarks WHERE kind = 'term' GROUP BY ref ORDER BY n DESC LIMIT 15"),
    one('SELECT COUNT(*) AS n FROM users WHERE email_verified = 1'),
    one('SELECT COUNT(*) AS n FROM users WHERE google_sub IS NOT NULL'),
    one('SELECT COUNT(DISTINCT user_id) AS n FROM pageviews WHERE user_id IS NOT NULL AND day >= ?', dayAdd(today, -6)),
  ]);
  const sIn = (a, b) => signups.filter(x => x.day >= a && x.day <= b).reduce((s, x) => s + x.n, 0);
  // 회원 목록(관리자 화면 전용, 최근 가입 순 500명): 이메일·이름·인증·Google·가입/마지막 로그인 시각만. 비밀번호 해시 등은 내보내지 않는다.
  const { results: mlist } = await env.UDB.prepare('SELECT email, name, email_verified AS v, (google_sub IS NOT NULL) AS g, created_at AS c, last_login_at AS l FROM users ORDER BY created_at DESC LIMIT 500').all().catch(() => ({ results: [] }));
  return {
    ok: true, range, today, from, generated_at: now, tz: 'Asia/Seoul',
    totals: {
      today: { ...t0, prev: t1 }, d7: { ...w0, prev: w1 }, d30: { ...m0, prev: m1 },
      signups: { range: sIn(from, today), prev: sIn(from2, dayAdd(from, -1)), today: sIn(today, today) },
    },
    daily, hourly: hourly.map(x => ({ t: x.h * 3600e3 - KST, pv: x.pv, uv: x.uv })),
    regions, langs, clients, devices, pages, refs, countries,
    members: { list: mlist || [], total: (members && members.n) || 0, verified: (verified && verified.n) || 0, google: (google && google.n) || 0, active7: (active && active.n) || 0, signups: signups.filter(x => x.day >= from) },
    bookmarks: { kinds: bmk, articles: topArt, terms: topTerm },
    note: '용어 클릭 순위는 피드 Worker(/api/term/top)에 있어 여기 D1과 분리돼 있습니다.',
  };
}
