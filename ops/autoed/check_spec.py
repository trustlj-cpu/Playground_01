#!/usr/bin/env python3
"""spec JSON 검증: 구조, id↔팝업, 용어가 본문에 있는지, 금지 문구. 통과하면 ok 출력. run.py 는 check(spec) 를 불러 쓴다."""
import json, re, sys

BAN = re.compile(r'written with Claude|help of Claude|se redacta con ayuda|Anthropic.{0,30}(model|modelo)|AI[- ]written|geschrieben mit|rédigé avec', re.I)


def check(spec):
    err = []
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
        n = sum(len(p.get(k) or '') for k in ['what', 'why', 'me', 'say'])
        floor = 450 if spec.get('region') in ('KR', 'JP', 'TW') else 900
        if n < floor: err.append(f'popup {i} too short {n} < {floor} (what 4-5문장, why·me·say 각 2문장)')
    for s in st:
        for k in ['id', 'cat', 'verify', 'hl', 'paras']:
            if not s.get(k): err.append(f'story {s.get("id")} missing {k}')
        if '<br' in s.get('hl', ''): err.append('br in headline')
    if not st or not st[0].get('deck'): err.append('lead needs deck')
    if not st or not st[4].get('briefs') or len(st[4]['briefs']) < 5: err.append('story[4] needs briefs (5+)')
    text = ' '.join(' '.join(s['paras']) + ' ' + s['hl'] + ' ' + s.get('deck', '') for s in st)
    text += ' ' + ' '.join(i['hl'] + ' ' + i['em'] for i in spec.get('index', []))
    text += ' ' + ' '.join(r['claim'] + ' ' + r['resp'] for r in spec.get('rumor', []))
    text += ' ' + ' '.join(r['text'] for r in spec.get('next', []))
    text += ' ' + ' '.join(' '.join(p.values()) for p in spec.get('popups', {}).values())
    g = spec.get('glossary', {})
    if not 12 <= len(g) <= 40: err.append(f'glossary {len(g)} (want 18-25)')
    body = ' '.join(' '.join(s['paras']) + ' ' + s['hl'] + ' ' + s.get('deck', '') for s in st) + ' ' + ' '.join(i['hl'] + ' ' + i['em'] for i in spec.get('index', []))
    miss = [k for k in g if k not in body]
    if miss: err.append(f'glossary keys not in visible text: {miss[:6]}')
    if BAN.search(json.dumps(spec, ensure_ascii=False)): err.append('forbidden production wording')
    if not spec.get('blurb') or len(spec.get('pool', [])) < 8: err.append('blurb/pool')
    for k, v in spec.get('markets', {}).items():
        if not isinstance(v, dict) or v.get('v') is None: err.append(f'market {k}')
    return err


if __name__ == '__main__':
    err = check(json.load(open(sys.argv[1], encoding='utf-8')))
    print('ok' if not err else 'ERR ' + '; '.join(err))
    sys.exit(1 if err else 0)
