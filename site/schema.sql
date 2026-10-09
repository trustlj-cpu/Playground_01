-- 데일리드롭 회원·북마크·방문 통계 (Cloudflare D1: dailydrop-users, binding UDB)
-- 적용: npx wrangler d1 execute dailydrop-users --remote --file=schema.sql   (모두 IF NOT EXISTS라 여러 번 실행해도 안전)
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT NOT NULL UNIQUE,            -- 소문자로 저장
  name TEXT,
  google_sub TEXT UNIQUE,                -- Google 계정 고유 ID(sub)
  pw_hash TEXT,                          -- PBKDF2-SHA256(base64), 이메일 가입자만
  pw_salt TEXT,                          -- 16바이트 무작위(base64)
  pw_iter INTEGER,
  email_verified INTEGER NOT NULL DEFAULT 0,
  role TEXT NOT NULL DEFAULT 'member',   -- 'member' | 'admin' (ADMIN_EMAILS로 로그인 때 부여)
  created_at INTEGER NOT NULL,           -- ms epoch
  last_login_at INTEGER
);
CREATE TABLE IF NOT EXISTS sessions (
  token_hash TEXT PRIMARY KEY,           -- SHA-256(쿠키 토큰) hex. 토큰 원문은 저장하지 않음
  user_id INTEGER NOT NULL,
  created_at INTEGER NOT NULL,
  expires_at INTEGER NOT NULL,
  ua TEXT
);
CREATE INDEX IF NOT EXISTS sessions_user ON sessions(user_id);
CREATE TABLE IF NOT EXISTS bookmarks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  kind TEXT NOT NULL CHECK (kind IN ('article','term')),
  region TEXT NOT NULL DEFAULT 'KR',
  date TEXT NOT NULL DEFAULT '',         -- 호 날짜 YYYY-MM-DD
  lang TEXT NOT NULL DEFAULT '',
  ref TEXT NOT NULL,                     -- 기사 data-id 또는 용어
  title TEXT,
  url TEXT,
  note TEXT,                             -- 용어 뜻 등 짧은 설명
  created_at INTEGER NOT NULL,
  UNIQUE (user_id, kind, region, date, ref)
);
CREATE INDEX IF NOT EXISTS bookmarks_user ON bookmarks(user_id, created_at);
CREATE TABLE IF NOT EXISTS pageviews (
  ts INTEGER NOT NULL,                   -- ms epoch
  day TEXT NOT NULL,                     -- YYYY-MM-DD (UTC)
  path TEXT NOT NULL,
  region TEXT,
  lang TEXT,
  ref_host TEXT,                         -- 유입 호스트(경로·검색어 없이)
  device TEXT,                           -- 'mobile' | 'tablet' | 'desktop'
  client TEXT,                           -- 'web' | 'app'
  country TEXT,
  vid_hash TEXT,                         -- SHA-256(day+IP+UA+salt) 앞 32자: 하루 단위 순방문자, IP 원문 저장 안 함
  user_id INTEGER
);
CREATE INDEX IF NOT EXISTS pv_ts ON pageviews(ts);
CREATE INDEX IF NOT EXISTS pv_day ON pageviews(day);
CREATE TABLE IF NOT EXISTS auth_attempts (
  ip_hash TEXT NOT NULL,
  ts INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS auth_attempts_ip ON auth_attempts(ip_hash, ts);
CREATE TABLE IF NOT EXISTS email_codes (
  email TEXT PRIMARY KEY,
  code_hash TEXT NOT NULL,
  expires_at INTEGER NOT NULL,
  tries INTEGER NOT NULL DEFAULT 0
);
