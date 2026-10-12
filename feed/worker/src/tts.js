// 기사 읽어주기(한국판 1면, 관리자 전용 시험 기능) — 대본 만들기 · 음성 엔진 어댑터 · 음성 캐시(D1)
// 원고는 판마다 하나(사장님 10/12: 「한가지 원고로만 간다. 뉴스 방송용 원고로 실제 뉴스 앵커가 말하듯이 보도.」). 기사만/라디오 모드는 없앴다.
// 흐름: 사이트 빌드가 /<날짜>/tts.json(지면 제목·부제·본문 + anchor: site/editions/anchor/<날짜>.json 앵커 원고)을 낸다
//  → 이 Worker가 앵커 원고(anchor)로 대본을 만든다. 앵커 원고가 없는 판만 지면 글자로 대신 읽는다(문장 끝 「~다」→「~습니다」, 괄호 출처는 「○○ 보도입니다」)
//  → 대본 조각마다 음성을 한 번만 만들어 D1(tts_audio)에 저장하고 다시 쓴다. 매분 크론이 오늘 판 조각을 미리 만들어 둔다.
// 엔진 교체: 아래 ENGINES 에 어댑터를 하나 더 두고 ENGINE 이름만 바꾸면 된다(캐시 키에 엔진·목소리 id가 들어가 섞이지 않음).

// ───────────────────────── 음성 엔진 어댑터 ─────────────────────────
const b64bytes = s => { const bin = atob(s); const u = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i); return u; };
export const ENGINES = {
  // 오늘 쓰는 엔진: Cloudflare Workers AI 내장 MeloTTS. 한국어(lang 'kr')는 화자 한 명(여성 음색)뿐이라 목소리 고르기는 없다.
  'workers-ai-melotts': {
    id: 'cf-melotts-kr-1', mime: 'audio/mpeg', voice: 'MeloTTS KR (단일 화자)',
    async synth(env, text) {
      if (!env.AI) throw new Error('no AI binding');
      const r = await env.AI.run('@cf/myshell-ai/melotts', { prompt: text, lang: 'kr' });
      if (r && typeof r.audio === 'string') return b64bytes(r.audio);
      if (r instanceof Uint8Array) return r;
      if (r instanceof ArrayBuffer) return new Uint8Array(r);
      if (r && typeof r.getReader === 'function') return new Uint8Array(await new Response(r).arrayBuffer());
      throw new Error('melotts: unexpected output');
    },
  },
  // ▼▼▼ 교체 자리(아직 쓰지 않음): Google Gemini TTS. 사장님이 키를 주시면 여기만 채우고 ENGINE 을 'gemini-tts' 로 바꾼다.
  //     키는 wrangler secret 으로 넣는다(코드·저장소에 두지 않음). 응답이 PCM이면 WAV 헤더를 붙여 mime 'audio/wav' 로 돌려준다.
  'gemini-tts': {
    id: 'gemini-tts-UNSET', mime: 'audio/wav', voice: '(미정 — 차분한 여성 뉴스 톤)',
    async synth() { throw new Error('gemini-tts adapter is a stub: not configured'); },
  },
  // ▲▲▲
  // ▼▼▼ 교체 자리(아직 쓰지 않음): ElevenLabs TTS(사장님 10/12 「일레븐랩스로 해보자」). 키 없음 · 호출 없음.
  //     쓰게 되면: ELEVENLABS_API_KEY 를 wrangler secret 으로 넣고, 고른 목소리 id를 voice 에, 모델(예: eleven v4 계열)을 정해
  //     POST https://api.elevenlabs.io/v1/text-to-speech/<voice_id> (xi-api-key 헤더, {text, model_id}) → audio/mpeg 바이트를 돌려준다.
  //     id 를 바꾸면 캐시 키가 달라져 MeloTTS 음성과 섞이지 않는다.
  'elevenlabs-tts': {
    id: 'elevenlabs-UNSET', mime: 'audio/mpeg', voice: '(미정 — 한국어 뉴스 앵커 톤 성우 목소리)',
    async synth() { throw new Error('elevenlabs-tts adapter is a stub: not configured'); },
  },
  // ▲▲▲
};
export const ENGINE = 'workers-ai-melotts';
export const engine = () => ENGINES[ENGINE];

// ───────────────────────── 문장 끝 바꾸기(「~다」→「~습니다」) ─────────────────────────
const H0 = 0xAC00;
const isHangul = ch => { const c = ch.charCodeAt(0); return c >= H0 && c <= 0xD7A3; };
const jong = ch => (ch.charCodeAt(0) - H0) % 28;
const withJong = (ch, j) => String.fromCharCode(ch.charCodeAt(0) - jong(ch) + j);
const J_N = 4, J_L = 8, J_B = 17;
// 받침 없는 줄기로 끝나는 형용사·동사(이 뒤의 「다」는 서술격 조사 「이다」가 아님)
const VSTEM = new Set(['아니', '크', '다르', '빠르', '이르', '바쁘', '나쁘', '기쁘', '예쁘', '아프', '슬프', '고프', '느리', '흐리', '비싸', '싸', '짜', '차', '그러', '이러', '저러', '되', '하', '보', '주', '오', '가', '서', '나', '지', '두', '쓰', '크']);
// 한 낱말(문장 마지막 낱말, 끝이 「다」)을 방송 말투로. 바꿀 수 없으면 null
export function toBroadcastWord(w) {
  if (!/[가-힣]다$/.test(w)) return null;
  const head = w.slice(0, -1), s = head.slice(-1), pre = head.slice(0, -1);
  if (!isHangul(s)) return null;
  const j = jong(s);
  if (head.endsWith('는') && head.length >= 2 && isHangul(head.slice(-2, -1)) && jong(head.slice(-2, -1)) !== 0) return head.slice(0, -1) + '습니다'; // 받는다 → 받습니다
  if (j === J_N) return pre + withJong(s, J_B) + '니다'; // 한다 → 합니다, 본다 → 봅니다, 만든다 → 만듭니다
  if (j === J_L) return pre + withJong(s, J_B) + '니다'; // 멀다 → 멉니다
  if (j !== 0) return head + '습니다'; // 했다·있다·없다·않다·많다·어렵다 → +습니다
  if (/[하되]$/.test(head)) return pre + withJong(s, J_B) + '니다'; // 중요하다 → 중요합니다, 만하다 → 만합니다
  if (head.endsWith('이')) return pre + '입니다'; // 핵심이다 → 핵심입니다
  for (const st of VSTEM) if (head.endsWith(st) && (head.length === st.length || st.length >= 2)) return pre + withJong(s, J_B) + '니다'; // 아니다 → 아닙니다
  return head + '입니다'; // 문제다 → 문제입니다
}

// 괄호 속 출처 표기인가(매체 이름만 가운뎃점으로 이어진 것)
const OUTLETS = new Set('연합뉴스 로이터 블룸버그 한겨레 뉴시스 뉴스1 머니투데이 이데일리 헤럴드경제 서울신문 국민일보 세계일보 프레시안 오마이뉴스 아시아경제 파이낸셜뉴스 디지털타임스 전자신문 노컷뉴스 데일리안 TV조선 채널A 닛케이 교도통신 신화통신 알자지라 가디언 워싱턴포스트 뉴욕타임스 월스트리트저널 파이낸셜타임스 이코노미스트 폴리티코 액시오스 ZDNet코리아 지디넷코리아 블로터 한국일보 문화일보 내일신문 아시아투데이 경향신문 조선일보 중앙일보 동아일보 한국경제 매일경제 서울경제 조선비즈 한경 매경'.split(' '));
const isOutlet = x => { x = x.trim(); return !!x && x.length <= 16 && !/\d{2,}|[()]/.test(x) && (OUTLETS.has(x) || /^[A-Z][A-Za-z&.]{1,7}$/.test(x) || /(일보|신문|뉴스|방송|통신|경제|타임스|저널|TV|닷컴|코리아|포스트)$/.test(x)); };
export const creditOf = inner => { const xs = String(inner).split(/[·,]/).map(s => s.trim()); return xs.length && xs.every(isOutlet) ? xs : null; };
// 받침 여부(와/과): 한글은 종성, 영문 약어는 마지막 글자 이름(L·M·N·R은 받침)
const hasBatchim = w => { const c = w.trim().slice(-1); if (isHangul(c)) return jong(c) !== 0; if (/[LMNRlmnr]/.test(c)) return true; if (/[0-9]/.test(c)) return /[013678]/.test(c); return false; };
export const creditLine = xs => { if (xs.length === 1) return `${xs[0]} 보도입니다.`; const a = xs.slice(0, -1), last = xs[xs.length - 1], p = a[a.length - 1]; return `${a.slice(0, -1).map(x => x + ', ').join('')}${p}${hasBatchim(p) ? '과' : '와'} ${last} 보도입니다.`; };

// 문장 나누기: 마침표·물음표 뒤 공백 기준(소수점 7,811.54 처럼 숫자 사이 점은 나누지 않음)
export const sentences = t => String(t || '').replace(/\s+/g, ' ').trim().split(/(?<=[.?!])\s+(?=\S)/).filter(Boolean);

const digits = s => (String(s).match(/\d+/g) || []).join(',');
// 바꾼 문장이 원문과 「마지막 낱말의 끝」만 다른지 검사(이름·숫자·날짜가 바뀌면 원문으로 되돌린다)
export function sameFacts(orig, conv) {
  if (digits(orig) !== digits(conv)) return false;
  const a = orig.trim().split(/\s+/), b = conv.trim().split(/\s+/);
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length - 1; i++) if (a[i] !== b[i]) return false;
  const la = a[a.length - 1], lb = b[b.length - 1];
  const stemA = la.replace(/다[.?!]?$/, ''), common = Math.max(0, stemA.length - 1); // 마지막 음절(받침 바뀜)만 허용
  return lb.slice(0, common) === stemA.slice(0, common) && /(습니다|입니다|[가-힣]니다)[.?!]?$/.test(lb);
}

// 한 문장 → [대본 문장들]. 끝의 「(매체·매체).」는 「매체와 매체 보도입니다.」로 떼어 낸다.
export function broadcastSentence(s) {
  s = s.trim(); const out = [];
  const m = s.match(/^(.*?)\(([^()]{1,120})\)([.?!]?)$/);
  let core = s, credit = null;
  if (m && creditOf(m[2])) { core = m[1].trimEnd() + (m[3] || '.'); credit = creditOf(m[2]); }
  const mm = core.match(/^(.*?)(\S+?)([.?!]?)$/);
  let conv = core;
  if (mm) { const w = toBroadcastWord(mm[2]); if (w) { const c2 = mm[1] + w + (mm[3] || '.'); conv = sameFacts(core, c2) ? c2 : core; } }
  out.push(conv);
  if (credit) out.push(creditLine(credit));
  return out;
}
export const broadcastText = t => sentences(t).flatMap(broadcastSentence);

// ───────────────────────── 여는 말·넘어가는 말·닫는 말 ─────────────────────────
// 사실을 덧붙이지 않는다(날짜·판 이름·다음 기사 분야만). 날짜 홀짝으로 서로 겹치지 않는 묶음을 써서 다음 날 판과도 다르다.
const NATIVE1 = ['', '한', '두', '세', '네', '다섯', '여섯', '일곱', '여덟', '아홉'], NATIVE10 = ['', '열', '스물', '서른', '마흔', '쉰', '예순', '일흔', '여든', '아흔'];
export const nativeNum = (n, attr = true) => { if (n <= 0 || n >= 100) return null; const t = Math.floor(n / 10), o = n % 10; if (t === 2 && o === 0 && attr) return '스무'; return NATIVE10[t] + NATIVE1[o]; };
const WD = ['일', '월', '화', '수', '목', '금', '토'];
const dayParity = date => Math.floor(Date.parse(date + 'T00:00:00Z') / 86400000) % 2;
const OPEN = [[
  '{md} {wd}요일, 데일리드롭 조간입니다. 오늘은 {n} 가지 소식을 전해 드립니다.',
  '안녕하십니까. {md} {wd}요일 데일리드롭 조간입니다. 오늘 1면에는 {n} 가지 소식이 실렸습니다.',
], [
  '{md} {wd}요일 아침, 데일리드롭 조간을 전해 드립니다. 오늘 소식은 {n} 가지입니다.',
  '데일리드롭 조간, {md} {wd}요일 판입니다. 1면 {n} 가지 소식을 차례로 읽어 드리겠습니다.',
]];
const TRANS = [[
  '이어서 {c} 소식입니다.', '다음은 {c} 소식입니다.', '{c} 분야로 넘어가겠습니다.', '이번에는 {c} 소식을 전해 드립니다.', '계속해서 {c} 소식입니다.',
  '{c} 소식 이어 가겠습니다.', '화제를 바꿔 {c} 소식입니다.', '다음 소식은 {c} 분야입니다.', '이번 소식은 {c} 분야입니다.', '{c} 쪽 소식도 살펴보겠습니다.',
], [
  '분위기를 바꿔 보겠습니다. {c} 소식입니다.', '이제 {c} 소식으로 가 보겠습니다.', '{c} 소식 전해 드립니다.', '다음으로 {c} 분야 소식입니다.', '이어지는 소식은 {c} 분야입니다.',
  '{c} 소식도 있습니다.', '눈을 돌려 {c} 소식입니다.', '{c} 분야 소식을 이어 갑니다.', '이번엔 {c} 이야기입니다.', '자리를 옮겨 {c} 소식입니다.',
]];
const CLOSE = [[
  '지금까지 데일리드롭 조간이었습니다. 내일 아침 여섯 시에 다시 뵙겠습니다.',
  '오늘 데일리드롭 조간은 여기까지입니다. 내일 아침 여섯 시에 다시 찾아뵙겠습니다.',
], [
  '데일리드롭 조간, 여기서 마칩니다. 내일 아침 여섯 시에 새 판으로 뵙겠습니다.',
  '오늘 1면 소식을 모두 전해 드렸습니다. 데일리드롭이었습니다. 내일 아침 여섯 시에 만나겠습니다.',
]];
const seedOf = date => [...date].reduce((a, c) => (a * 31 + c.charCodeAt(0)) >>> 0, 7);
export function links(date, cats) { // cats: 둘째 기사부터의 분야 목록
  const p = dayParity(date), seed = seedOf(date), d = new Date(date + 'T00:00:00Z');
  const md = `${d.getUTCMonth() + 1}월 ${d.getUTCDate()}일`, wd = WD[d.getUTCDay()];
  const n = cats.length + 1;
  const open = OPEN[p][seed % OPEN[p].length].replace('{md}', md).replace('{wd}', wd).replace('{n}', nativeNum(n) || String(n));
  const close = CLOSE[p][(seed >> 3) % CLOSE[p].length];
  const pool = TRANS[p], used = new Set();
  const trans = cats.map((c, i) => { let line = null; for (let k = 0; k < pool.length && !line; k++) { const t = pool[(seed + i + k) % pool.length]; if (!used.has(t)) { used.add(t); line = t.replace('{c}', c); } } return line || `${i + 2}번째 소식, ${c} 분야입니다.`; });
  return { open, close, trans };
}
const catOf = kick => { const c = String(kick || '').split(/[·\s]*[·]\s*(?:보도|원자료|✓)|\s·\s/)[0].trim(); return c || '다음'; };

// ───────────────────────── 대본 ─────────────────────────
const MAXSEG = 220;
// 문장 묶기: 음성 조각 하나(≤220자)에 들어가는 문장들. 조각마다 lines(문장 목록)를 같이 내 자막이 문장 단위로 넘어가게 한다.
const chunkLines = (sents, max = MAXSEG) => { const out = []; let cur = []; for (const s of sents) { if (cur.length && (cur.join(' ') + ' ' + s).length > max) { out.push(cur); cur = [s]; } else cur.push(s); } if (cur.length) out.push(cur); return out; };
const clean = t => String(t || '').replace(/\s+/g, ' ').trim();
// 앵커 원고(site/editions/anchor/<날짜>.json): {date, opening, stories:[{id, transition, lines:[..]}], closing}
export const hasAnchor = data => !!(data && data.anchor && Array.isArray(data.anchor.stories) && data.anchor.stories.some(s => Array.isArray(s.lines) && s.lines.length));
// data = tts.json {date, stories:[{id, cat, title, deck, body:[..]}], anchor?}. only = 기사 id(그 기사 부분만, 여는·넘어가는·닫는 말 없음)
export function buildScript(data, only = '') {
  const segs = [];
  const push = (story, kind, lines) => { lines = lines.map(clean).filter(Boolean); for (const g of chunkLines(lines)) segs.push({ i: segs.length, story, kind, text: g.join(' '), lines: g }); };
  if (hasAnchor(data)) {
    const A = data.anchor, st = A.stories.filter(s => s && s.id && (!only || s.id === only));
    if (!only) push(null, 'open', sentences(A.opening));
    st.forEach((s, k) => { if (!only && clean(s.transition)) push(s.id, 'trans', sentences(s.transition)); push(s.id, 'body', s.lines || []); });
    if (!only) push(null, 'close', sentences(A.closing));
    return segs;
  }
  // 앵커 원고가 없는 판: 지면 글자로 대신 읽기(제목 → 부제 → 본문)
  const st = (data.stories || []).filter(s => !only || s.id === only);
  const L = links(data.date, (data.stories || []).slice(1).map(s => s.cat || catOf(s.kick)));
  if (!only) push(null, 'open', sentences(L.open));
  st.forEach(s => {
    const idx = (data.stories || []).indexOf(s);
    if (!only && idx > 0) push(s.id, 'trans', [L.trans[idx - 1]]);
    push(s.id, 'title', [String(s.title || '')]);
    if (s.deck) push(s.id, 'deck', broadcastText(s.deck));
    (s.body || []).forEach(p => push(s.id, 'body', broadcastText(p)));
  });
  if (!only) push(null, 'close', sentences(L.close));
  return segs;
}

// ───────────────────────── 읽기용 글자 다듬기(음성 엔진에만 넘김, 대본 표시는 그대로) ─────────────────────────
const SINO = ['영', '일', '이', '삼', '사', '오', '육', '칠', '팔', '구'];
const sino4 = n => { let s = ''; const u = ['천', '백', '십', '']; const d = String(n).padStart(4, '0'); for (let i = 0; i < 4; i++) { const x = +d[i]; if (!x) continue; s += (x === 1 && i < 3 ? '' : SINO[x]) + u[i]; } return s; };
export function sinoNum(str) {
  const [ip, fp] = String(str).replace(/,/g, '').split('.'); let n = ip.replace(/^0+(?=\d)/, ''); let out = '';
  if (n === '0') out = '영'; else { const units = ['', '만', '억', '조', '경']; const groups = []; while (n.length) { groups.unshift(n.slice(-4)); n = n.slice(0, -4); } groups.forEach((g, i) => { const v = +g; if (!v) return; const u = units[groups.length - 1 - i]; out += (v === 1 && u === '만' ? '' : sino4(v)) + u; }); }
  if (fp) out += ' 점 ' + [...fp].map(c => SINO[+c]).join('');
  return out;
}
const LETTERS = { A: '에이', B: '비', C: '씨', D: '디', E: '이', F: '에프', G: '지', H: '에이치', I: '아이', J: '제이', K: '케이', L: '엘', M: '엠', N: '엔', O: '오', P: '피', Q: '큐', R: '알', S: '에스', T: '티', U: '유', V: '브이', W: '더블유', X: '엑스', Y: '와이', Z: '지' };
const WORDS = { 'S&P': '에스앤피', 'AT&T': '에이티앤티', 'K-': '케이 ', '%p': ' 퍼센트포인트', '%': ' 퍼센트' };
const COUNTER = '명|차례|가지|곳|개(?!월)|살|번째|번|시간|척|마리|권|잔|채';
const MONTH = { 6: '유월', 10: '시월' };
export function speechText(t) {
  let s = String(t);
  s = s.replace(/[‘’“”"'「」『』]/g, '').replace(/…/g, ', ');
  s = s.replace(/S&P|AT&T/g, m => WORDS[m]).replace(/(\d)\s*%p/g, '$1' + WORDS['%p']).replace(/(\d)\s*%/g, '$1' + WORDS['%']);
  s = s.replace(/\+(?=\d)/g, '플러스 ').replace(/(^|[\s(])-(?=\d)/g, '$1마이너스 ');
  s = s.replace(/(\d+)\s*·\s*(\d+)월/g, (m, a, b) => `${MONTH[+a] || sinoNum(a) + '월'}, ${MONTH[+b] || sinoNum(b) + '월'}`);
  s = s.replace(/(\d+)월/g, (m, a) => MONTH[+a] || sinoNum(a) + '월');
  s = s.replace(new RegExp('(?<![\\d.,])(\\d{1,2})\\s*(?=(?:' + COUNTER + '))', 'g'), (m, a) => { const v = nativeNum(+a); return v ? v + ' ' : m; });
  s = s.replace(/\d[\d,]*(?:\.\d+)?/g, m => sinoNum(m));
  s = s.replace(/\b[A-Z]{2,5}\b/g, m => [...m].map(c => LETTERS[c]).join(''));
  s = s.replace(/\(/g, ', ').replace(/\)/g, ', ').replace(/·/g, ', ').replace(/\s*,\s*(,\s*)+/g, ', ').replace(/\s+/g, ' ').replace(/,\s*([.?!])/g, '$1').trim();
  return s;
}

// ───────────────────────── 음성 캐시(D1) ─────────────────────────
let TABLE_OK = false;
async function ensureTable(env) {
  if (TABLE_OK) return;
  await env.DB.prepare('CREATE TABLE IF NOT EXISTS tts_audio (k TEXT PRIMARY KEY, ed TEXT, engine TEXT, mime TEXT, bytes INTEGER, audio BLOB, created_at TEXT)').run();
  TABLE_OK = true;
}
export async function audioKey(text) {
  const e = engine(); const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(e.id + '|' + speechText(text)));
  return [...new Uint8Array(buf)].slice(0, 16).map(b => b.toString(16).padStart(2, '0')).join('');
}
const inflight = new Map();
export async function getAudio(env, ed, text) {
  await ensureTable(env); const e = engine(); const k = await audioKey(text);
  const row = await env.DB.prepare('SELECT mime, audio FROM tts_audio WHERE k = ?1').bind(k).first();
  if (row && row.audio) return { k, mime: row.mime, bytes: row.audio instanceof Uint8Array ? row.audio : new Uint8Array(row.audio), hit: true };
  if (!inflight.has(k)) inflight.set(k, (async () => { const bytes = await e.synth(env, speechText(text));
    await env.DB.prepare('INSERT OR IGNORE INTO tts_audio (k, ed, engine, mime, bytes, audio, created_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)').bind(k, ed, e.id, e.mime, bytes.length, bytes, new Date().toISOString()).run();
    return bytes; })().finally(() => inflight.delete(k)));
  return { k, mime: e.mime, bytes: await inflight.get(k), hit: false };
}

// ───────────────────────── 판 자료 가져오기 ─────────────────────────
const SITE = 'https://dailydropnewspaper.com';
export const okDate = d => /^\d{4}-\d\d-\d\d$/.test(d || '');
export async function loadEdition(date) {
  const r = await fetch(`${SITE}/${date}/tts.json`, { cf: { cacheTtl: 300, cacheEverything: true } });
  if (!r.ok) return null; const j = await r.json().catch(() => null);
  return j && Array.isArray(j.stories) ? j : null;
}
const kstDate = () => new Date(Date.now() + 9 * 3600e3).toISOString().slice(0, 10);

// 매분 크론: 오늘 판의 원고 하나에서 아직 없는 음성 조각을 몇 개씩 미리 만든다. 다 만들어졌으면 아무것도 하지 않는다(옛 라디오 조각은 더 만들지 않음).
export async function prewarm(env, date = kstDate(), budget = 4) {
  if (!env.AI || !env.DB) return { made: 0 };
  // 자정~06시(KST)에는 오늘 판이 아직 공개 전이므로 어제 판(지금 1면에 떠 있는 판)을 미리 만든다
  let ed = await loadEdition(date); if (!ed) { date = new Date(Date.parse(date + 'T00:00:00Z') - 864e5).toISOString().slice(0, 10); ed = await loadEdition(date); }
  if (!ed) return { made: 0, date, missing: 'edition' };
  await ensureTable(env); let made = 0;
  // 오래된 음성은 지운다(하루 약 90조각 · 수 MB — 7일만 보관해 D1 용량이 쌓이지 않게)
  await env.DB.prepare('DELETE FROM tts_audio WHERE created_at < ?1').bind(new Date(Date.now() - 7 * 864e5).toISOString()).run();
  for (const s of buildScript(ed)) {
    if (made >= budget) return { made, date };
    const k = await audioKey(s.text);
    if (await env.DB.prepare('SELECT 1 FROM tts_audio WHERE k = ?1').bind(k).first()) continue;
    await getAudio(env, date, s.text); made++;
  }
  return { made, date, done: true };
}

// ───────────────────────── HTTP ─────────────────────────
// GET /tts/script.json?date=[&story=id]  ·  GET /tts/audio?date=&i=[&story=]   (mode 없음 — 원고 하나. 예전 mode= 는 무시)
// 공개 Worker 주소지만 판 파일에 실린 문장만 읽을 수 있고, 같은 문장은 한 번만 만든다(무엇이든 읽히는 통로가 아님). 화면 노출·권한은 사이트 Worker(/api/tts/*, 관리자만)에서.
export async function handleTTS(req, env, url) {
  const date = url.searchParams.get('date') || '', story = (url.searchParams.get('story') || '').replace(/[^\w-]/g, '').slice(0, 40);
  const J = (o, s = 200) => new Response(JSON.stringify(o), { status: s, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' } });
  if (!okDate(date)) return J({ error: 'bad date' }, 400);
  const ed = await loadEdition(date); if (!ed) return J({ error: 'no edition' }, 404);
  const segs = buildScript(ed, story);
  if (url.pathname === '/tts/script.json') return J({ date, story: story || null, script: hasAnchor(ed) ? 'anchor' : 'text', engine: ENGINE, voice: engine().voice, segments: segs, stories: ed.stories.map(s => ({ id: s.id, title: s.title })) });
  if (url.pathname === '/tts/audio') {
    const i = Number(url.searchParams.get('i')); const s = segs[i]; if (!Number.isInteger(i) || !s) return J({ error: 'bad segment' }, 404);
    try { const a = await getAudio(env, date, s.text); return new Response(a.bytes, { headers: { 'content-type': a.mime, 'content-length': String(a.bytes.length), 'cache-control': 'private, max-age=86400', 'x-tts-cache': a.hit ? 'hit' : 'miss' } }); }
    catch (e) { return J({ error: 'tts failed', detail: String(e && e.message || e).slice(0, 200) }, 503); }
  }
  return J({ error: 'not found' }, 404);
}
