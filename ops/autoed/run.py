#!/usr/bin/env python3
"""DailyDrop 자동 조간 — Claude Code 세션 없이 GitHub Actions에서 판을 만든다.

매시 실행된다. countries.json 의 나라마다 '현지 시각이 03:00–11:59이고 그 날짜 판이 아직 없으면' 판을 만든다.
- 자료: 피드 Worker 공개 엔드포인트(/items.json, /quotes.json, /jev.json) — D1 토큰 불필요
- 작성: Anthropic API (ANTHROPIC_API_KEY, 모델은 DD_MODEL, 기본 claude-sonnet-5-5)
- 검증: A/G 파싱, data-id ↔ A 일치, <article> 닫힘, 크기, build.js 통과
- 등록: editions.json(publish_at = 현지 06:00, 이미 지났으면 즉시) + markets.json + pool.json
커밋·push·배포는 워크플로가 한다. 사용: python ops/autoed/run.py [--only KR,JP] [--max 12] [--dry]
"""
import argparse, concurrent.futures as cf, datetime as dt, json, os, re, subprocess, sys, urllib.request
from zoneinfo import ZoneInfo

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
SITE = os.path.join(ROOT, 'site')
HERE = os.path.dirname(os.path.abspath(__file__))
FEED = os.environ.get('DD_FEED', 'https://dailydrop-feed.trustlj.workers.dev')
MODEL = os.environ.get('DD_MODEL') or 'claude-sonnet-5-5'
NO1 = dt.date(2026, 10, 5)
D1_FEED = '0f239386-f7cf-42ed-838d-46eb896bea87'
WINDOW = (3, 12)  # 현지 03:00 이상 12:00 미만에만 만든다(06:00 이후면 즉시 공개)

LANG = {  # 판 언어 설명(REGION_RUNBOOK 표 기준)
    'KR': 'Korean', 'JP': 'Japanese', 'US': 'American English', 'GB': 'British English', 'DE': 'German', 'FR': 'French',
    'IN': 'Indian English (lakh/crore with international equivalents)', 'AU': 'Australian English', 'CA': 'Canadian English',
    'TW': 'Traditional Chinese (Taiwan usage)', 'SG': 'Singapore English (British spelling)', 'BR': 'Brazilian Portuguese',
    'MX': 'Mexican Spanish', 'IT': 'Italian', 'ES': 'Castilian Spanish', 'NL': 'Dutch', 'CH': 'Swiss Standard German (no ß, write ss)',
    'ID': 'Indonesian', 'VN': 'Vietnamese', 'TH': 'Thai', 'PH': 'Philippine English', 'MY': 'Malaysian English',
    'HK': 'Traditional Chinese (Hong Kong usage)', 'NZ': 'New Zealand English', 'PK': 'Pakistani English', 'AE': 'Arabic (RTL)',
    'SA': 'Arabic (RTL)', 'IL': 'Hebrew (RTL)', 'TR': 'Turkish', 'EG': 'Arabic (RTL; EGX trades Sun–Thu)', 'KE': 'Kenyan English',
    'UA': 'Ukrainian', 'PL': 'Polish', 'ZA': 'South African English', 'NG': 'Nigerian English', 'AT': 'Austrian German',
    'BE': 'Flemish Dutch (cover all Belgium)', 'IE': 'Irish English', 'PT': 'European Portuguese (never Brazilian)',
    'AR': 'Argentine Spanish', 'CL': 'Chilean Spanish', 'CO': 'Colombian Spanish', 'PE': 'Peruvian Spanish',
}


def get(path):
    req = urllib.request.Request(FEED + path, headers={'user-agent': 'dailydrop-autoed'})
    with urllib.request.urlopen(req, timeout=60) as r:
        return json.load(r)


def jload(p):
    with open(p, encoding='utf-8') as f:
        return json.load(f)


def jsave(p, obj, indent=1):
    with open(p, 'w', encoding='utf-8') as f:
        f.write(json.dumps(obj, ensure_ascii=False, indent=indent) + '\n')


def due(countries, editions, now, only):
    have = {(e['date'], e.get('region') or 'KR') for e in editions}
    out = []
    for c in countries:
        code = c['code']
        if only and code not in only:
            continue
        loc = now.astimezone(ZoneInfo(c['tz']))
        d = loc.date().isoformat()
        if (d, code) in have or not (WINDOW[0] <= loc.hour < WINDOW[1]):
            continue
        six = dt.datetime.combine(loc.date(), dt.time(6), ZoneInfo(c['tz'])).astimezone(dt.timezone.utc)
        out.append({'c': c, 'date': d, 'no': (loc.date() - NO1).days + 1,
                    'publish_at': six.strftime('%Y-%m-%dT%H:%M:%SZ') if six > now else None, 'six': six})
    out.sort(key=lambda x: x['six'])  # 발행이 급한 나라부터
    return out


def backfill(countries, editions, dates, only, now):
    """지난 날짜 소급(사장님 10/16 '3번'): 그 날짜 판이 없는 나라를 즉시 공개(publish_at 없음)로 만든다."""
    have = {(e['date'], e.get('region') or 'KR') for e in editions}
    out = []
    for d in dates:
        day = dt.date.fromisoformat(d)
        for c in countries:
            if (only and c['code'] not in only) or (d, c['code']) in have:
                continue
            six = dt.datetime.combine(day, dt.time(6), ZoneInfo(c['tz'])).astimezone(dt.timezone.utc)
            if six > now:
                continue
            out.append({'c': c, 'date': d, 'no': (day - NO1).days + 1, 'publish_at': None, 'six': six})
    out.sort(key=lambda x: (x['date'], x['six']))
    return out


def window(job, now):
    five = dt.datetime.combine(dt.date.fromisoformat(job['date']), dt.time(5), ZoneInfo(job['c']['tz'])).astimezone(dt.timezone.utc)
    end = min(five, now)
    return end - dt.timedelta(hours=30), end


def d1(sql, params):
    acct, tok = os.environ.get('CLOUDFLARE_ACCOUNT_ID'), os.environ.get('CLOUDFLARE_API_TOKEN')
    if not acct or not tok:
        return None
    req = urllib.request.Request(f'https://api.cloudflare.com/client/v4/accounts/{acct}/d1/database/{D1_FEED}/query',
                                 data=json.dumps({'sql': sql, 'params': params}).encode(), method='POST',
                                 headers={'authorization': 'Bearer ' + tok, 'content-type': 'application/json'})
    try:
        with urllib.request.urlopen(req, timeout=60) as r:
            res = json.load(r)
        return res['result'][0]['results']
    except Exception as e:
        print('  D1 query failed, falling back to /items.json:', str(e)[:200], flush=True)
        return None


def items_for(job, now, recent):
    lo, hi = window(job, now)
    f = lambda t: t.strftime('%Y-%m-%dT%H:%M:%S')
    rows = d1("SELECT title, source, tier, region, published_at, link, batch FROM items WHERE region IN (?1,'GLB') AND published_at >= ?2 AND published_at <= ?3 AND batch NOT LIKE '%bf-%' ORDER BY tier, published_at DESC LIMIT 600",
              [job['c']['code'], f(lo), f(hi) + 'Z'])
    if rows is not None:
        return rows
    return [i for i in recent if f(lo) <= str(i.get('published_at') or '')[:19] <= f(hi)]


def prev_edition(editions, code, before):
    rows = sorted((e for e in editions if (e.get('region') or 'KR') == code and e['date'] < before), key=lambda e: e['date'])
    for e in reversed(rows):
        p = os.path.join(SITE, e['file'])
        if os.path.exists(p):
            return e, p
    return None, None


def material(code, items, jev, quotes, keys):
    pool = [i for i in items if i.get('region') in (code, 'GLB') and 'bf-' not in str(i.get('batch') or '')]
    pool.sort(key=lambda i: (str(i.get('tier') or 'Z'), -(dt.datetime.fromisoformat(str(i.get('published_at') or '1970-01-01T00:00:00+00:00').replace('Z', '+00:00')).timestamp() if i.get('published_at') else 0)))
    lines = [f"{i.get('tier','?')} | {i.get('region')} | {i.get('source','')} | {str(i.get('published_at',''))[:16]} | {str(i.get('title','')).strip()} | {i.get('link','')}" for i in pool[:350]]
    jv = sorted((r for r in jev if not r.get('err')), key=lambda r: (-(r.get('front') or 0), -(r.get('conf') or 0)))
    seen, jl = set(), []
    for r in jv:
        k = str(r.get('title', ''))[:60]
        if k in seen:
            continue
        seen.add(k)
        jl.append(f"front {r.get('front')} · conf {r.get('conf')} · n {r.get('n')} · {r.get('title')}")
        if len(jl) >= 40:
            break
    ql = []
    for k in keys:
        q = quotes.get(k)
        if q:
            asof = dt.datetime.fromtimestamp((q.get('ts') or 0) / 1000, dt.timezone.utc).strftime('%Y-%m-%d %H:%M UTC') if q.get('ts') else '?'
            ql.append(f"{k}: v={q.get('v')} chg={q.get('chg')} prev={q.get('prev')} state={q.get('state')} asof={asof}")
        else:
            ql.append(f'{k}: (no quote — show "—" if not confirmable)')
    return lines, jl, ql


def prompt(job, tpl_html, lines, jl, ql, brief, runbook):
    c = job['c']
    return f"""You are the DailyDrop desk. Write the {c['code']} MORNING edition No. {job['no']} dated {job['date']} in {LANG.get(c['code'], 'the edition language')}, published at 06:00 local ({c['tz']}).

=== HOUSE BRIEF ===
{brief}

=== RUNBOOK (region table and rules; ignore tool/session steps — you only write the page) ===
{runbook}

=== THIS RUN ===
- Region {c['code']}, prefix "{c['prefix']}", date {job['date']}, No. {job['no']}. Cover the previous ~24h up to ~05:00 local on {job['date']}; 'what to watch' = TODAY {job['date']}.
- U.S. figures: the latest COMPLETED U.S. session before 05:00 local.{' LATE (back-filled) issue: write it exactly as it would have read at 05:00 local on that date — nothing that happened later; QUOTES are current values and may be newer than that date, so use them for ears ONLY if their asof is on/before the edition cut-off, else "—".' if job.get('late') else ''}
- Story selection: lead = Jev's highest-rated story that 2+ outlets carry; main stories from Jev's top distinct stories; single-outlet items only as attributed briefs.
- Ears and figures: ONLY the QUOTES below (or "—"). Never invent numbers, names, quotes or dates. Separate event date from report date.
- Keep the template's skeleton, CSS, script and the exact `  const A = {{` / `  const G = {{` … `  }};` lines. Every data-id has an A entry (each with "title") and vice versa. Close every <article>. No <br> in headlines. Glossary keys must appear literally in the body; notes describe this issue only.

=== JEV RANKING (front 0–3, higher = more front-page) ===
{chr(10).join(jl) or '(none)'}

=== QUOTES ===
{chr(10).join(ql)}

=== ITEMS (tier | region | source | published UTC | title | link) ===
{chr(10).join(lines)}

=== TEMPLATE (previous {c['code']} edition — reproduce this structure exactly with today's content) ===
{tpl_html}

=== OUTPUT FORMAT (strict) ===
First the complete HTML file between the lines <<<HTML and HTML>>>.
Then a JSON object between <<<META and META>>>: {{"blurb": "three key items joined by ' · ' in the edition language", "markets": {{"<tape key>": {{"v": number, "chg": number, "asof": "M/D"}}, ...only confirmed figures}}, "pool": ["10–16 one-line briefs in the edition language, each ending with (Source)"]}}.
Nothing else."""


def call(p):
    import anthropic
    cl = anthropic.Anthropic(max_retries=4)
    with cl.messages.stream(model=MODEL, max_tokens=64000, messages=[{'role': 'user', 'content': p}]) as s:
        msg = s.get_final_message()
    txt = ''.join(b.text for b in msg.content if getattr(b, 'type', '') == 'text')
    return txt, msg.usage


def parse(txt):
    h = re.search(r'<<<HTML\s*\n(.*?)\n\s*HTML>>>', txt, re.S)
    m = re.search(r'<<<META\s*\n(.*?)\n\s*META>>>', txt, re.S)
    if not h or not m:
        raise ValueError('output markers missing')
    meta = json.loads(re.sub(r'^```(?:json)?|```$', '', m.group(1).strip()).strip())
    return h.group(1).strip() + '\n', meta


CHECK_JS = r"""
const h=require('fs').readFileSync(process.argv[1],'utf8');
const g=h.match(/const G = (\{[\s\S]*?\n  \});\n/); if(!g) throw 'G not found';
const G=new Function('return '+g[1])();
const a=h.match(/const A = (\{[\s\S]*?\n  \});\n/); if(!a) throw 'A not found';
const A=new Function('return '+a[1])();
const ids=[...new Set([...h.matchAll(/data-id="([^"]+)"/g)].map(x=>x[1]))];
const miss=ids.filter(i=>!A[i]), extra=Object.keys(A).filter(k=>!ids.includes(k)), nt=Object.keys(A).filter(k=>!A[k].title);
if(miss.length) throw 'A missing for '+miss; if(extra.length) throw 'A without data-id '+extra; if(nt.length) throw 'A without title '+nt;
const o=(h.match(/<article\b/g)||[]).length, c=(h.match(/<\/article>/g)||[]).length; if(o!==c||o<4) throw 'article open '+o+' close '+c;
if(/<h[23][^>]*class="hl"[^>]*>[^<]*<br/i.test(h)) throw 'br in headline';
console.log('ok', ids.length, 'ids', Object.keys(G).length, 'terms');
"""


def validate(path, tpl_len):
    size = os.path.getsize(path)
    if size < tpl_len * 0.6:
        raise ValueError(f'too short: {size} vs template {tpl_len}')
    r = subprocess.run(['node', '-e', CHECK_JS, path], capture_output=True, text=True)
    if r.returncode:
        raise ValueError('check failed: ' + (r.stderr or r.stdout).strip()[-400:])
    return r.stdout.strip()


def register(job, meta):
    code, d = job['c']['code'], job['date']
    m = jload(os.path.join(SITE, 'markets.json'))
    mk = {k: v for k, v in (meta.get('markets') or {}).items() if isinstance(v, dict) and v.get('v') is not None}
    if code == 'KR':
        m[d] = mk
    else:
        m.setdefault(code, {})[d] = mk
    jsave(os.path.join(SITE, 'markets.json'), m)
    if meta.get('pool'):
        p = jload(os.path.join(SITE, 'pool.json'))
        def cv(x):
            if isinstance(x, dict):
                return x
            mm = re.match(r'^(.*?)\s*\(([^()]{1,40})\)\s*$', str(x))
            return {'t': mm.group(1).strip(), 's': mm.group(2).strip()} if mm else {'t': str(x).strip()}
        p[d if code == 'KR' else f'{code}:{d}'] = [cv(x) for x in meta['pool']]
        jsave(os.path.join(SITE, 'pool.json'), p)
    ef = os.path.join(SITE, 'editions.json')
    e = [x for x in jload(ef) if not (x['date'] == d and (x.get('region') or 'KR') == code)]
    x = {'date': d, 'no': job['no'], 'file': f"editions/{job['c']['prefix']}{d}.html", 'blurb': str(meta.get('blurb', ''))}
    if code != 'KR':
        x['region'] = code
    if job['publish_at']:
        x['publish_at'] = job['publish_at']
    e.append(x)
    order = ['KR', 'US', 'JP']
    e.sort(key=lambda x: (x['date'], order.index(x.get('region') or 'KR') if (x.get('region') or 'KR') in order else 9, x.get('region') or ''))
    with open(ef, 'w', encoding='utf-8') as f:
        f.write(json.dumps(e, ensure_ascii=False, indent=2) + '\n')


def commit(msg):
    """판 하나 끝날 때마다 바로 push(긴 소급 실행이 중간에 끊겨도 앞의 판은 남게). DD_COMMIT=1 일 때만."""
    if os.environ.get('DD_COMMIT') != '1':
        return
    g = lambda *a: subprocess.run(['git', *a], cwd=ROOT, capture_output=True, text=True)
    g('add', 'site/editions', 'site/editions.json', 'site/markets.json', 'site/pool.json')
    if g('diff', '--cached', '--quiet').returncode == 0:
        return
    g('commit', '-m', msg)
    for i in range(4):
        if g('pull', '--rebase', 'origin', 'paycheck-page').returncode == 0 and g('push', 'origin', 'HEAD:paycheck-page').returncode == 0:
            return
    print('  push failed (will retry with the next edition / final step)', flush=True)


def build_ok():
    r = subprocess.run(['node', 'build.js', 'editions.json'], cwd=SITE, capture_output=True, text=True)
    return r.returncode == 0, (r.stderr or r.stdout)[-600:]


def snapshot():
    return {f: open(os.path.join(SITE, f), encoding='utf-8').read() for f in ('editions.json', 'markets.json', 'pool.json')}


def restore(snap):
    for f, t in snap.items():
        open(os.path.join(SITE, f), 'w', encoding='utf-8').write(t)


def make(job, editions, items, jev_by, quotes, brief, runbook):
    c = job['c']
    _, tpl = prev_edition(editions, c['code'], job['date'])
    if not tpl:
        raise ValueError('no previous edition to use as template')
    tpl_html = open(tpl, encoding='utf-8').read()
    keys = [t[1] for t in c.get('tape', [])]
    lines, jl, ql = material(c['code'], items, jev_by.get(c['code'], []), quotes, keys)
    if len(lines) < 15:
        raise ValueError(f'too few items ({len(lines)})')
    last = None
    for attempt in range(2):
        txt, usage = call(prompt(job, tpl_html, lines, jl, ql, brief, runbook))
        try:
            html, meta = parse(txt)
            out = os.path.join(SITE, 'editions', c['prefix'] + job['date'] + '.html')
            os.makedirs(os.path.dirname(out), exist_ok=True)
            open(out, 'w', encoding='utf-8').write(html)
            info = validate(out, len(tpl_html.encode()))
            return out, meta, info, usage
        except Exception as ex:
            last = ex
            print(f"  {c['code']} attempt {attempt + 1} invalid: {ex}", flush=True)
    raise ValueError(f'invalid after retries: {last}')


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--only', default=os.environ.get('DD_ONLY', ''))
    ap.add_argument('--max', type=int, default=int(os.environ.get('DD_MAX', '14')))
    ap.add_argument('--workers', type=int, default=4)
    ap.add_argument('--dates', default=os.environ.get('DD_DATES', ''), help='소급: 2026-10-13,2026-10-14')
    ap.add_argument('--dry', action='store_true')
    a = ap.parse_args()
    only = {x.strip().upper() for x in a.only.split(',') if x.strip()}
    now = dt.datetime.now(dt.timezone.utc)
    countries = jload(os.path.join(SITE, 'countries.json'))
    editions = jload(os.path.join(SITE, 'editions.json'))
    dates = [x.strip() for x in a.dates.split(',') if x.strip()]
    jobs = (backfill(countries, editions, dates, only, now) if dates else due(countries, editions, now, only))[:a.max]
    for j in jobs:
        j['late'] = bool(dates)
    print(f'{now:%Y-%m-%d %H:%M}Z due:', [(j['c']['code'], j['date'], j['publish_at'] or 'now') for j in jobs], flush=True)
    if not jobs or a.dry:
        return 0
    if not os.environ.get('ANTHROPIC_API_KEY'):
        print('ANTHROPIC_API_KEY 없음 — 저장소 Settings → Secrets 에 추가해야 자동 발행이 돈다.')
        return 1
    since = (now - dt.timedelta(hours=36)).strftime('%Y-%m-%dT%H:%M:%S')
    try:
        recent = get('/items.json?since=' + since).get('items', [])
    except Exception as e:
        recent = []
        print('  /items.json failed:', e, flush=True)
    quotes = get('/quotes.json').get('q', {})
    jev_by = {}
    for j in jobs:
        try:
            jev_by[j['c']['code']] = get('/jev.json?region=' + j['c']['code']).get('rows', [])
        except Exception:
            jev_by[j['c']['code']] = []
    brief = open(os.path.join(HERE, 'BRIEF.md'), encoding='utf-8').read()
    runbook = open(os.path.join(HERE, 'REGION_RUNBOOK.md'), encoding='utf-8').read()
    print(f'recent items {len(recent)} · quotes {len(quotes)} · model {MODEL}', flush=True)
    done, failed = [], []
    with cf.ThreadPoolExecutor(a.workers) as ex:
        futs = {ex.submit(make, j, editions, items_for(j, now, recent), jev_by, quotes, brief, runbook): j for j in jobs}
        for f in cf.as_completed(futs):
            j = futs[f]
            code = j['c']['code']
            try:
                out, meta, info, usage = f.result()
            except Exception as e:
                failed.append((code, str(e)[:300]))
                print(f'  FAIL {code}: {e}', flush=True)
                continue
            snap = snapshot()
            register(j, meta)
            ok, log = build_ok()
            if not ok:
                restore(snap)
                os.remove(out)
                failed.append((code, 'build: ' + log.strip()[-300:]))
                print(f'  FAIL {code} build: {log}', flush=True)
                continue
            done.append(code)
            commit(f"autoed: {code} {j['date']} No.{j['no']}" + (' (late)' if j.get('late') else ''))
            print(f"  OK {code} {j['date']} No.{j['no']} {info} · in {usage.input_tokens} out {usage.output_tokens}", flush=True)
    summary = {'at': now.isoformat(), 'done': done, 'failed': failed}
    os.makedirs(os.path.join(ROOT, 'ops', 'autoed', 'log'), exist_ok=True)
    with open(os.path.join(ROOT, 'ops', 'autoed', 'log', now.strftime('%Y-%m-%d') + '.jsonl'), 'a', encoding='utf-8') as f:
        f.write(json.dumps(summary, ensure_ascii=False) + '\n')
    gh = os.environ.get('GITHUB_STEP_SUMMARY')
    if gh:
        with open(gh, 'a', encoding='utf-8') as f:
            f.write(f"### DailyDrop autoed {now:%Y-%m-%d %H:%M}Z\n- done: {', '.join(done) or '-'}\n" + ''.join(f'- FAIL {c}: {m}\n' for c, m in failed))
    return 0 if done or not failed else 2


if __name__ == '__main__':
    sys.exit(main())
