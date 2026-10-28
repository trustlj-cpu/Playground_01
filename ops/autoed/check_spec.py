#!/usr/bin/env python3
"""spec JSON 검증: 구조, id↔팝업, 용어가 본문에 있는지, 금지 문구. 통과하면 ok 출력. run.py 는 check(spec) 를 불러 쓴다."""
import json, re, sys

BAN = re.compile(r'written with Claude|help of Claude|se redacta con ayuda|Anthropic.{0,30}(model|modelo)|AI[- ]written|geschrieben mit|rédigé avec', re.I)


def _toks(t):
    w = set(x.lower() for x in re.findall(r'[A-Za-zÀ-ÿĀ-ž\u0400-\u04FF\u0590-\u05FF\u0600-\u06FF]{4,}|\d[\d.,]*\d|\d{2,}', t))
    c = re.sub(r'[^\u3040-\u30ff\u4e00-\u9fff\uac00-\ud7af]', '', t)
    return w | set(c[i:i + 2] for i in range(len(c) - 1))


def dup_items(spec, th=0.5):
    # 사장님 2026-10-19: 같은 판 안 중복 기사 절대 금지 — 본문 기사·짧게 보는 오늘(index)·짧게 더(briefs)가 같은 소식을 다시 다루면 안 된다.
    it = []
    for s in spec.get('stories', []):
        it.append(('story ' + s['id'], _toks(s['hl'] + ' ' + s.get('deck', ''))))
        for b in s.get('briefs', []): it.append(('brief ' + b['t'][:20], _toks(b['t'] + ' ' + b['s'])))
    for i in spec.get('index', []): it.append(('index ' + str(i.get('id')), _toks(i['hl'] + ' ' + i.get('em', ''))))
    out = []
    for x in range(len(it)):
        for y in range(x + 1, len(it)):
            (a, ta), (b, tb) = it[x], it[y]
            if a.startswith('story') and b.startswith('story') or not ta or not tb: continue
            if len(ta & tb) / min(len(ta), len(tb)) >= th: out.append(f'{a}~{b}')
    return out


def check(spec):
    err = []
    if spec.get('slot') not in (None, '', 'pm'): err.append(f'slot {spec.get("slot")!r} (석간이면 "pm", 조간이면 필드 생략)')
    st = spec.get('stories', [])
    if len(st) != 5: err.append(f'stories {len(st)} != 5')
    if len(spec.get('index', [])) != 5: err.append('index != 5')
    if len(spec.get('rumor', [])) != 3: err.append('rumor != 3')
    if len(spec.get('ears', [])) != 2: err.append('ears != 2')
    ids = [s['id'] for s in st] + [i['id'] for i in spec.get('index', [])]
    for i in ids:
        p = spec.get('popups', {}).get(i)
        if not p: err.append(f'popup missing {i}'); continue
        for k in ['what', 'why', 'me', 'say', 'src']:
            if not p.get(k): err.append(f'popup {i}.{k} empty')
        # 팝업 분량 하한(what+why+me+say): 10/17 호에서 한 줄짜리 팝업이 나와 추가. 한·중·일은 글자 수가 적어 하한을 낮춘다.
        n = sum(len(p.get(k) or '') for k in ['what', 'why', 'me', 'a', 'b', 'say'])
        floor = {'KR': 600, 'JP': 480, 'TW': 380}.get(spec.get('region'), 900)
        if n < floor: err.append(f'popup {i} too short {n} < {floor} (what 5~8문장, why·me 각 2~3문장, a·b·say 포함)')
    # 짧게 보는 오늘: 10/17 호에서 헤드라인이 조각나고 em 이 한 구절이 됐고 tag 가 영어 그대로였다.
    reg = spec.get('region')
    cjk = reg in ('KR', 'JP', 'TW')
    rtl = reg in ('IL', 'SA')
    en = reg in ('US', 'GB', 'AU', 'CA', 'IN')
    em_min, hl_min = (40, 15) if cjk else (45, 40) if rtl else (80, 50)
    for it in spec.get('index', []):
        if len(it.get('em', '')) < em_min: err.append(f'index {it.get("id")} em too short {len(it.get("em", ""))} < {em_min} (구체적 사실 2문장)')
        if len(it.get('hl', '')) < hl_min: err.append(f'index {it.get("id")} hl too short {len(it.get("hl", ""))} < {hl_min} (완결된 헤드라인 한 문장)')
        if not en and 'outlets' in it.get('tag', ''): err.append(f'index {it.get("id")} tag 를 그 나라 말로')

    # 초반 호 방식(사장님 2026-10-18): 리드 본문 정확히 2문단, 나머지 1~2문단, a·b(두 가지 시선) 채움, 본문에 자료·편집 메타 문장 금지
    if st:
        if len(st[0].get('paras', [])) != 2: err.append(f'lead paras {len(st[0].get("paras", []))} != 2 (리드 본문은 정확히 2문단)')
        for s_ in st[1:]:
            if not 1 <= len(s_.get('paras', [])) <= 2: err.append(f'story {s_.get("id")} paras must be 1-2')
    empty_ab = [i for i in ids if not ((spec.get('popups', {}).get(i) or {}).get('a') and (spec.get('popups', {}).get(i) or {}).get('b'))]
    # 사장님 2026-10-19 일관성 검수: 10/16~18 호에서 a·b 가 통째로 비어 발행됨 → 빈 칸 0개.
    if empty_ab: err.append(f'a·b(두 가지 시선) 비어 있는 팝업 {empty_ab} — 10개 전부 채운다')
    # 출처: 6~9호처럼 '매체(무엇, 날짜)'. Google News 는 매체가 아니다.
    DATE = re.compile(r'\d{1,2}[/.]\d{1,2}|\d{1,2}\s*(月|월|日)|\b\d{1,2}\s+[A-Za-zÀ-ÿ]{3,}|[A-Za-z]{3,}\.?\s+\d{1,2}\b|\d{1,2}\s*[\u0590-\u06FF]')
    for i in ids:
        src = (spec.get('popups', {}).get(i) or {}).get('src', '')
        if re.search(r'google\s*news|news\.google', src, re.I): err.append(f'popup {i}.src 에 Google News — 실제 매체 이름으로')
        if not DATE.search(src): err.append(f'popup {i}.src 에 날짜 없음 — "매체(무엇, 날짜)" 형식')
        if len(re.split(r'\s*[·,;、،]\s*', src.strip())) < 2 and len(src) < 25: err.append(f'popup {i}.src 너무 짧음')
    # extras: 원문 링크 + 인플루언서 발언(10/14~ 빠졌던 것). finish.py 가 site/extras 로 쓴다.
    ex = spec.get('extras') or {}
    infl = ex.get('infl') or []
    if not 4 <= len(infl) <= 6: err.append(f'extras.infl {len(infl)}개 (4~6: 자국 2~3 + 세계 2~3)')
    for k, x in enumerate(infl):
        if not all(x.get(f) for f in ['who', 'where', 'date', 'u', 't']): err.append(f'infl[{k}] who/where/date/u/t 누락')
        elif not re.match(r'https?://', x['u']): err.append(f'infl[{k}].u URL 아님')
        elif not all(x['t'].get(l) for l in ['en', 'ko', 'ja']): err.append(f'infl[{k}].t en·ko·ja 필요')
    srcl = ex.get('src') or {}
    for i in ids:
        L = srcl.get(i) or []
        ptxt = (spec.get('popups', {}).get(i) or {}).get('src', '')
        if not L: err.append(f'extras.src[{i}] 원문 링크 없음(1개 이상)')
        for l in L:
            if not re.match(r'https?://', l.get('u', '')) or not l.get('n') or l['n'] not in ptxt: err.append(f'extras.src[{i}] n 이 src 글자에 없거나 u 가 URL 아님: {l.get("n")}')
    import re as _re
    meta = _re.compile(r'Jev|jev|수집된|수집분|이번 호는|독자가 기억|독자에게 필요|편이 안전|편이 정확|추측성|収集した|本号は|今号は|collected (stories|reports|articles)|this edition|in this edition|the feed\b|were gathered|our sources|not in the (collected|sources)', _re.I)
    body_text = ' '.join(' '.join(s_.get('paras', [])) + ' ' + s_.get('deck', '') for s_ in st) + ' ' + ' '.join((b.get('t', '') + ' ' + b.get('s', '')) for s_ in st for b in s_.get('briefs', []) or [])
    mm = sorted(set(m.group(0) for m in meta.finditer(body_text)))
    if mm: err.append(f'본문에 자료·편집 메타 표현 금지: {mm}')
    # 문체(사장님 2026-10-29): 본문은 "A는 …전했다. B는 …보도했다" 나열 금지 — 기사 한 편의 본문(paras)에 매체 이름은 4번 이하(초회판 문체: 사실은 우리 목소리로, 매체는 단독·엇갈림·인용 때만)
    _OUT = _re.compile(r'연합뉴스|조선일보|경향신문|동아일보|한국경제|한겨레|중앙일보|매일경제|문화일보|서울신문|뉴시스|뉴스1|JTBC|채널A|한국일보|이데일리|머니투데이|파이낸셜뉴스|아시아경제|헤럴드경제|전자신문|KBS|SBS|MBC|YTN|共同通信|朝日新聞|読売新聞|毎日新聞|日本経済新聞|日経|時事通信|産経|TBS|テレビ朝日|フジテレビ|日本テレビ|ロイター|ブルームバーグ|NHK|Reuters|Associated Press|\\bAP\\b|Bloomberg|CNBC|NBC|CBS|\\bABC\\b|CNN|Fox News|NPR|PBS|Politico|Axios|The Hill|New York Times|Washington Post|Wall Street Journal|WSJ|Guardian|BBC|\\bNYT\\b')
    for s_ in st:
        k_ = len(_OUT.findall(' '.join(s_.get('paras', []))))
        if k_ > 4: err.append(f'story {s_.get("id")} 본문에 매체 이름 {k_}번 > 4 — "A는 …전했다" 나열 금지, 사실은 우리 목소리로 쓰고 매체는 단독·엇갈림·인용 때만(출처는 verify·팝업 src 에)')
    for s in st:
        for k in ['id', 'cat', 'verify', 'hl', 'paras']:
            if not s.get(k): err.append(f'story {s.get("id")} missing {k}')
        if '<br' in s.get('hl', ''): err.append('br in headline')
    if not st or not st[0].get('deck'): err.append('lead needs deck')
    # 사장님 2026-10-20: 단신 칸은 '짧게 보는 오늘' 하나로 합친다 — '짧게 더'(briefs) 폐지. 5번 기사는 본문 2문단 + nums 또는 word 로 채운다.
    if any(s_.get('briefs') for s_ in st): err.append("briefs('짧게 더') 폐지됨 — 단신은 index(짧게 보는 오늘)에만")
    if st and len(st) == 5 and (len(st[4].get('paras', [])) != 2 or not (st[4].get('nums') or st[4].get('word'))): err.append('story[4]: 본문 2문단 + nums 또는 word 필요(짧게 더 대신)')
    text = ' '.join(' '.join(s['paras']) + ' ' + s['hl'] + ' ' + s.get('deck', '') for s in st)
    text += ' ' + ' '.join(i['hl'] + ' ' + i['em'] for i in spec.get('index', []))
    text += ' ' + ' '.join(r['claim'] + ' ' + r['resp'] for r in spec.get('rumor', []))
    text += ' ' + ' '.join(r['text'] for r in spec.get('next', []))
    text += ' ' + ' '.join(' '.join(p.values()) for p in spec.get('popups', {}).values())
    g = spec.get('glossary', {})
    if not 15 <= len(g) <= 40: err.append(f'glossary {len(g)} (15~40: 어려운 용어만, 사장님 10/25)')
    EASY = {'미디어', '언론', '방송', '지리', '지역', '인물', '스포츠', '야구', '축구', '농구', '배구', '골프', '연예', '기업', '회사', '메디아', 'メディア', '地理', '人物', 'スポーツ', '野球', 'サッカー', '企業', 'media', 'geography', 'people', 'person', 'sports', 'baseball', 'soccer', 'basketball', 'football', 'golf', 'business', 'company', 'companies', 'corporate', 'corporation', 'medios', 'geografía', 'personas', 'deportes', 'empresas'}
    easy = [k for k, v in g.items() if any(t.strip().lower() in EASY for t in re.split(r'[·/、,・]', str(v.get('f', ''))))]
    if easy: err.append(f'glossary easy terms (기업·매체·인물·지명·스포츠 분야는 용어사전에 넣지 않음): {easy[:6]}')
    body = ' '.join(' '.join(s['paras']) + ' ' + s['hl'] + ' ' + s.get('deck', '') for s in st) + ' ' + ' '.join(i['hl'] + ' ' + i['em'] for i in spec.get('index', []))
    miss = [k for k in g if k not in body]
    if miss: err.append(f'glossary keys not in visible text: {miss[:6]}')
    if BAN.search(json.dumps(spec, ensure_ascii=False)): err.append('forbidden production wording')
    # Google News 는 매체가 아니다(사장님 2026-10-19 검수) — 본문·팝업·단신 어디에도 금지. extras 의 URL 은 예외.
    vis = json.dumps({k: v for k, v in spec.items() if k != 'extras'}, ensure_ascii=False)
    if re.search(r'google\s*news', vis, re.I): err.append('Google News 를 매체로 쓰지 마라(본문·팝업·단신 전부) — 실제 매체 이름으로')
    if not spec.get('blurb') or len(spec.get('pool', [])) < 8: err.append('blurb/pool')
    for k, v in spec.get('markets', {}).items():
        if not isinstance(v, dict) or v.get('v') is None: err.append(f'market {k}')
    # 사장님 2026-10-21 승인: ① kick/tag 의 '✓ N' = 팝업 src 의 매체 수(· 로 나눈 항목 수) ② 헤드라인 숫자는 본문(또는 팝업 what)에 그대로 있어야
    pops = spec.get('popups', {})
    def nsrc(i):
        return len([x for x in re.split(r'\s*[·•]\s*', (pops.get(i) or {}).get('src', '')) if x.strip()])
    def num_tokens(t):
        return {x.replace(',', '').replace(' ', '') for x in re.findall(r'\d[\d,.]*\d%?|\d+%?', t) if len(x.replace(',', '')) >= 2}
    for x in st + spec.get('index', []):
        i = x.get('id'); lab = x.get('verify') or x.get('tag') or ''
        m = re.search(r'✓\s*(\d+)', lab)
        if m and i in pops and int(m.group(1)) != nsrc(i): err.append(f'{i}: 표기 ✓{m.group(1)} ≠ 출처 {nsrc(i)}곳(매체 수를 src 목록과 맞춰라)')
        body = ' '.join(x.get('paras', [])) + ' ' + x.get('deck', '') + ' ' + x.get('em', '') + ' ' + (pops.get(i) or {}).get('what', '')
        bn = {y.replace(',', '').replace(' ', '') for y in re.findall(r'\d[\d,.]*\d%?|\d+%?', body)}
        miss = [n for n in num_tokens(x.get('hl', '')) if n not in bn and n.rstrip('%') not in {b.rstrip('%') for b in bn}]
        if miss: err.append(f'{i}: 헤드라인 숫자 {miss} 가 본문·팝업에 없음(숫자 일치)')
    d = dup_items(spec)
    if d: err.append('duplicate items in edition: ' + ', '.join(d[:6]))
    return err


def prev_dups(spec, path, th=0.5):
    # 사장님 2026-10-19 일관성: 어제 판과 같은 사건을 그대로 다시 싣지 않는다(새 전개가 있으면 제목에 그 전개를 쓴다).
    import os, datetime as dt
    try:
        d = dt.date.fromisoformat(spec.get('date') or os.path.basename(path).split('_')[1])
    except Exception:
        return []
    path = os.path.abspath(path)
    if spec.get('slot') == 'pm':
        # 석간: 비교 대상은 같은 날 조간 spec(같은 폴더의 CODE_DATE_spec.json, 없으면 <mmdd> 폴더 규칙)
        pp = os.path.join(os.path.dirname(path), f"{spec.get('region')}_{d}_spec.json")
        if not os.path.exists(pp): pp = os.path.join(os.path.dirname(os.path.dirname(path)), d.strftime('%m%d'), f"{spec.get('region')}_{d}_spec.json")
        label = '조간'
    else:
        y = d - dt.timedelta(days=1)
        pp = os.path.join(os.path.dirname(os.path.dirname(path)), y.strftime('%m%d'), f"{spec.get('region')}_{y}_spec.json")
        label = '어제'
    if not os.path.exists(pp): return []
    old = json.load(open(pp, encoding='utf-8'))
    it = lambda s: [(('story ' + x['id']), _toks(x['hl'] + ' ' + x.get('deck', ''))) for x in s.get('stories', [])] + [(('index ' + str(x['id'])), _toks(x['hl'])) for x in s.get('index', [])]
    return [f'{a}~{label} {b}' for a, ta in it(spec) for b, tb in it(old) if ta and tb and len(ta & tb) / min(len(ta), len(tb)) >= th]


if __name__ == '__main__':
    spec = json.load(open(sys.argv[1], encoding='utf-8'))
    err = check(spec)
    pd = prev_dups(spec, sys.argv[1])
    if pd: err.append(('같은 날 조간과 같은 사건' if spec.get('slot') == 'pm' else '어제 판과 같은 사건') + '(새 전개면 제목을 새 전개로, 아니면 교체): ' + ', '.join(pd[:6]))
    print('ok' if not err else 'ERR ' + '; '.join(err))
    sys.exit(1 if err else 0)
