#!/usr/bin/env python3
"""DailyDrop 자동 조간 — Claude Code 세션 없이 GitHub Actions에서 판을 만든다.

매시 실행된다. countries.json 의 나라마다 '현지 시각이 05:30–11:59이고 그 날짜 판이 아직 없으면' 판을 만든다(Claude 세션이 못 올렸을 때의 폴백).
- 자료: D1(토큰 있으면) 또는 피드 Worker 공개 엔드포인트(/items.json, /quotes.json, /jev.json). 제목 중복을 합친 압축본만 모델에 준다
- 작성: Anthropic API 1회 호출(ANTHROPIC_API_KEY, 모델 DD_MODEL 기본 claude-sonnet-5-5, 노력 DD_EFFORT 기본 medium). 모델은 본문 spec JSON만 쓴다(SPEC.md)
- 조립: render.py 가 그 나라 직전 판의 뼈대·라벨에 spec 을 채운다. 검증: check_spec(구조·용어·금지문구) → A/G 파싱·data-id ↔ A·<article> → build.js
- 등록: editions.json(publish_at = 현지 06:00, 이미 지났으면 즉시) + markets.json + pool.json
커밋·push·배포는 워크플로가 한다. 사용: python ops/autoed/run.py [--only KR,JP] [--max 12] [--dry]
"""
import argparse, concurrent.futures as cf, datetime as dt, json, os, re, subprocess, sys, urllib.request
from zoneinfo import ZoneInfo

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import check_spec, prep, render

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
SITE = os.path.join(ROOT, 'site')
HERE = os.path.dirname(os.path.abspath(__file__))
FEED = os.environ.get('DD_FEED', 'https://dailydrop-feed.trustlj.workers.dev')
MODEL = os.environ.get('DD_MODEL') or 'claude-sonnet-5-5'
EFFORT = os.environ.get('DD_EFFORT') or 'medium'  # low|medium|high — 생각에 쓰는 토큰을 정한다
NO1 = dt.date(2026, 10, 5)
D1_FEED = '0f239386-f7cf-42ed-838d-46eb896bea87'
# 폴백 전용: 평소엔 Claude 세션이 현지 05:00 전에 판을 올려 두므로, 현지 05:30 이후에도 판이 없을 때만 API로 채운다(중복 작성 방지). 06:00 이후면 즉시 공개.
WINDOW_MIN = (5 * 60 + 30, 12 * 60)

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
        if (d, code) in have or not (WINDOW_MIN[0] <= loc.hour * 60 + loc.minute < WINDOW_MIN[1]):
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


def region_rows(job, now, recent):
    """나라 기사·세계 기사를 제목 중복을 합친 압축 행(t,src,n,tier,pub,sm)으로. D1 우선, 없으면 Worker /items.json 에서 같은 압축."""
    lo, hi = window(job, now)
    f = lambda t: t.strftime('%Y-%m-%dT%H:%M:%S')
    code = job['c']['code']
    r = d1(prep.sql_region(code, f(lo), f(hi)), [])
    w = d1(prep.sql_world(f(lo), f(hi), 30), [])
    inwin = lambda i: f(lo) <= str(i.get('published_at') or '')[:19] <= f(hi)
    if r is None:
        r = prep.compact([i for i in recent if i.get('region') == code and inwin(i) and 'bf-' not in str(i.get('batch') or '')], 40)
    if w is None:
        w = prep.compact([i for i in recent if i.get('region') == 'GLB' and i.get('tier') in ('A', 'B') and inwin(i) and 'bf-' not in str(i.get('batch') or '')], 30)
    return r, w


def prev_edition(editions, code, before):
    rows = sorted((e for e in editions if (e.get('region') or 'KR') == code and e['date'] < before), key=lambda e: e['date'])
    for e in reversed(rows):
        p = os.path.join(SITE, e['file'])
        if os.path.exists(p):
            return e, p
    return None, None


def row_lines(rows):
    return [f"{r.get('n')}|{r.get('tier')}|{str(r.get('pub', ''))[5:16]}|{str(r.get('t', '')).strip()}|{r.get('src', '')}|{str(r.get('sm') or '').strip()}" for r in rows]


def quote_lines(quotes, keys, cutoff):
    ql = []
    for k in keys:
        q = quotes.get(k)
        if q and q.get('ts'):
            asof = dt.datetime.fromtimestamp(q['ts'] / 1000, dt.timezone.utc)
            ok = 'ok' if asof <= cutoff else 'AFTER CUT-OFF — use "—"'
            ql.append(f"{k}: v={q.get('v')} chg={q.get('chg')} state={q.get('state')} asof={asof:%Y-%m-%d %H:%M}Z [{ok}]")
        else:
            ql.append(f'{k}: (no quote — "—")')
    return ql


def style_ref(tpl_html):
    """직전 판의 고정 문구(날짜줄·귀퉁이 설명·'다음' 라벨)를 알려 줘 같은 말투·언어를 잇게 한다."""
    dl = re.search(r'<div class="dateline"><span>([^<]*)</span><b>([^<]*)</b>', tpl_html)
    ears = re.findall(r'<div class="ear(?: r)?"><b>[^<]*</b>([^<]*)</div>', tpl_html)
    nx = re.findall(r'<b>([^<]{1,40})</b><span>', tpl_html[tpl_html.find('class="next"'):][:3000])
    return f"dateline left: {dl.group(1) if dl else '?'} | date: {dl.group(2) if dl else '?'}\near captions: {ears[:2]}\nnext labels: {nx[:4]}"


SYS_NOTE = """[API MODE] You cannot run tools or read files: ignore every instruction in the spec below about files, SQL, check_spec.py, world_*.json or reports. All material is in the user message.
Respond with ONE JSON object only (the spec), no markdown fence, no commentary. Everything you write is final page text: follow the editorial rules exactly.

"""


def call(system, user):
    import anthropic
    cl = anthropic.Anthropic(max_retries=4)
    with cl.messages.stream(model=MODEL, max_tokens=32000, output_config={'effort': EFFORT},
                            system=[{'type': 'text', 'text': system, 'cache_control': {'type': 'ephemeral'}}],
                            messages=[{'role': 'user', 'content': user}]) as st:
        msg = st.get_final_message()
    return ''.join(b.text for b in msg.content if getattr(b, 'type', '') == 'text'), msg.usage


def parse_spec(txt):
    t = txt.strip()
    i, j = t.find('{'), t.rfind('}')
    if i < 0 or j < i:
        raise ValueError('no JSON object in output')
    return json.loads(t[i:j + 1])


def build_user(job, rows, world, jl, ql, ref):
    c = job['c']
    late = (' LATE (back-filled) issue: write it exactly as it would have read at 05:00 local on that date — nothing that happened later.' if job.get('late') else '')
    return f"""Write the {c['code']} MORNING edition: region {c['code']}, date {job['date']}, No. {job['no']}, language {LANG.get(c['code'], 'the edition language')}, time zone {c['tz']}, published 06:00 local. Window ends ≈05:00 local; later events only under "what to watch today" ({job['date']}).{late}
Spec fields: "region":"{c['code']}", "date":"{job['date']}". Dateline number: No. {job['no']}.

=== STYLE REFERENCE (previous {c['code']} edition's fixed strings; keep wording/language/format) ===
{ref}

=== JEV RANKING (front 0-3; title | outlets) ===
{chr(10).join(jl) or '(none)'}

=== QUOTES (ears/markets: only [ok] completed closes, else "—") ===
{chr(10).join(ql)}

=== REGION ITEMS (outlets|tier|UTC|title|which outlets|gist; merged duplicates, more outlets = bigger story) ===
{chr(10).join(row_lines(rows))}

=== WORLD ITEMS (same columns; adapt for this country's readers, do not invent beyond them) ===
{chr(10).join(row_lines(world))}
"""


def make(job, editions, rows, world, jev, quotes, system):
    c = job['c']
    _, tpl = prev_edition(editions, c['code'], job['date'])
    if not tpl:
        raise ValueError('no previous edition to use as template')
    tpl_html = open(tpl, encoding='utf-8').read()
    if len(rows) < 8:
        raise ValueError(f'too few items ({len(rows)})')
    lo, hi = window(job, dt.datetime.now(dt.timezone.utc))
    jv = sorted((r for r in jev if not r.get('err')), key=lambda r: (-(r.get('front') or 0), -(r.get('conf') or 0)))
    seen, jl = set(), []
    for r in jv:
        k = str(r.get('title', ''))[:60]
        if k not in seen:
            seen.add(k)
            jl.append(f"{r.get('front')} | {r.get('title')} | n{r.get('n')}")
        if len(jl) >= 8:
            break
    ql = quote_lines(quotes, [t[1] for t in c.get('tape', [])], hi)
    user = build_user(job, rows, world, jl, ql, style_ref(tpl_html))
    last, usage_all = None, []
    for attempt in range(3):
        txt, usage = call(system, user + (f'\n\nYour previous answer failed these checks — fix them and answer again with the full JSON: {last}' if last else ''))
        usage_all.append(usage)
        try:
            spec = parse_spec(txt)
            spec['region'], spec['date'] = c['code'], job['date']
            # 본문에 없는 용어 키는 기계적으로 뺀다(남은 용어가 하한 이상일 때만) — 재시도 한 번을 아끼는 정리
            g = spec.get('glossary') or {}; st_ = spec.get('stories') or []
            vis = ' '.join(' '.join(x.get('paras', [])) + ' ' + x.get('hl', '') + ' ' + x.get('deck', '') for x in st_) + ' ' + ' '.join(i.get('hl', '') + ' ' + i.get('em', '') for i in spec.get('index', []))
            keep = {k: v for k, v in g.items() if k in vis}
            if len(keep) >= 30: spec['glossary'] = keep
            errs = check_spec.check(spec)
            if errs:
                raise ValueError('; '.join(errs)[:500])
            try:
                render.check_ids(spec)
                html = render.render(spec, tpl)
            except SystemExit as se:
                raise ValueError(f'render: {se}')
            out = os.path.join(SITE, 'editions', c['prefix'] + job['date'] + '.html')
            os.makedirs(os.path.dirname(out), exist_ok=True)
            open(out, 'w', encoding='utf-8').write(html)
            info = validate(out, len(tpl_html.encode()))
            return out, render.meta_of(spec), info, usage_all
        except Exception as ex:
            last = str(ex)[:500]
            print(f"  {c['code']} attempt {attempt + 1} invalid: {ex}", flush=True)
    raise ValueError(f'invalid after retries: {last}')


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


def commit(msg, force=False):
    """판 하나 끝날 때마다 바로 push(긴 소급 실행이 중간에 끊겨도 앞의 판은 남게). DD_COMMIT=1 일 때만."""
    if os.environ.get("DD_COMMIT") != "1" and not force:
        return
    g = lambda *a: subprocess.run(['git', *a], cwd=ROOT, capture_output=True, text=True)
    g('add', 'site/editions', 'site/editions.json', 'site/markets.json', 'site/pool.json', 'site/extras')
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
    countries = [c for c in jload(os.path.join(SITE, 'countries.json')) if not c.get('hidden')]  # 비공개 나라는 쓰지 않는다
    editions = jload(os.path.join(SITE, 'editions.json'))
    dates = [x.strip() for x in a.dates.split(',') if x.strip()]
    jobs = (backfill(countries, editions, dates, only, now) if dates else due(countries, editions, now, only))[:a.max]
    for j in jobs:
        j['late'] = bool(dates)
    print(f'{now:%Y-%m-%d %H:%M}Z due:', [(j['c']['code'], j['date'], j['publish_at'] or 'now') for j in jobs], flush=True)
    if not jobs or a.dry:
        return 0
    if not os.environ.get('ANTHROPIC_API_KEY'):
        print('ANTHROPIC_API_KEY 없음 — 폴백 작성은 건너뜀(Claude 세션이 판을 올리는 운영). 키를 넣으면 폴백이 켜진다.')
        return 0
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
    system = SYS_NOTE + open(os.path.join(HERE, 'SPEC.md'), encoding='utf-8').read()
    print(f'recent items {len(recent)} · quotes {len(quotes)} · model {MODEL} · effort {EFFORT}', flush=True)
    done, failed = [], []

    def work(j):
        rows, world = region_rows(j, now, recent)
        return make(j, editions, rows, world, jev_by.get(j['c']['code'], []), quotes, system)

    with cf.ThreadPoolExecutor(a.workers) as ex:
        futs = {ex.submit(work, j): j for j in jobs}
        for f in cf.as_completed(futs):
            j = futs[f]
            code = j['c']['code']
            try:
                out, meta, info, usages = f.result()
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
            tot = lambda k: sum(getattr(u, k, 0) or 0 for u in usages)
            print(f"  OK {code} {j['date']} No.{j['no']} {info} · in {tot('input_tokens')} (cache read {tot('cache_read_input_tokens')}) out {tot('output_tokens')} · calls {len(usages)}", flush=True)
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
