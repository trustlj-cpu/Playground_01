#!/usr/bin/env python3
"""spec JSON → 판 HTML. 에이전트는 본문 JSON만 쓰고, 뼈대(CSS·스크립트·라벨)는 그 나라 직전 판에서 가져온다.

사용: render.py SPEC.json [--tpl 직전판.html] [--out 출력.html]
- 스펙 형식은 SPEC.md. 직전 판은 site/editions.json 에서 그 나라의 가장 최근 판을 자동으로 찾는다.
- 석간: 스펙에 "slot":"pm" → 출력 <prefix><date>.pm.html, 템플릿은 같은 날 조간(없으면 그 전 가장 최근 판).
- 출력은 build.js 가 기대하는 모양(`  const A = {` … `  };`, `  const G = {` … `  };`)을 지킨다.
"""
import argparse, html, json, os, re, sys

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
SITE = os.path.join(ROOT, 'site')


def esc(s):
    # 작성자가 이미 &amp; 같은 엔티티로 쓴 글이 이중 이스케이프되어 화면에 'S&amp;P' 로 보이던 것 방지(10/29)
    return html.escape(html.unescape(str(s)), quote=False)


def find_template(region, date, slot=''):
    """직전 판(뼈대·라벨 출처). 조간: 그 날짜 전의 가장 최근 조간. 석간(slot 'pm'): 같은 날 조간, 없으면 그 전의 가장 최근 판."""
    ed = json.load(open(os.path.join(SITE, 'editions.json'), encoding='utf-8'))
    if slot:
        rows = sorted((e for e in ed if (e.get('region') or 'KR') == region and (e['date'] < date or (e['date'] == date and not e.get('slot')))),
                      key=lambda e: (e['date'], 1 if e.get('slot') else 0))
    else:
        rows = sorted((e for e in ed if (e.get('region') or 'KR') == region and e['date'] < date and not e.get('slot')), key=lambda e: e['date'])
    for e in reversed(rows):
        p = os.path.join(SITE, e['file'])
        if os.path.exists(p):
            return p
    raise SystemExit(f'no template for {region} before {date}')


def labels(tpl):
    """직전 판에서 그 나라 언어의 고정 문구를 뽑는다."""
    def one(pat, default=''):
        m = re.search(pat, tpl, re.S)
        return m.group(1) if m else default
    nums = re.findall(r'<h5>([^<]*)</h5>', tpl)
    return {
        'index_h4': one(r'<aside class="col c1 vr index">\s*<h4>([^<]*)</h4>'),
        'more': one(r'<div class="more">([^<]*)</div>'),
        'nums_h5': one(r'<div class="fill"><h5>([^<]*)</h5><div class="nums">'),
        'word_h5': one(r'<div class="fill word"><h5>([^<]*)</h5>'),
        'briefs_h5': one(r'<div class="fill"><h5>([^<]*)</h5><ul class="briefs">'),
        'house': one(r'<div class="house">([^<]*)</div>'),
        'rumor_h4': one(r'<div class="rumor">\s*<h4>([^<]*)</h4>'),
        'next_h4': one(r'<div class="next"[^>]*>\s*<h4>([^<]*)</h4>'),
        'all_h5': nums,
    }


def layout(tpl):
    """직전 판의 기사 배치(클래스·h2/h3·본문 div 종류)를 읽어 같은 모양으로 만든다."""
    arts = re.findall(r'<article class="([^"]*)" tabindex="0" data-id="[^"]*">(.*?)</article>', tpl, re.S)
    out = []
    for cls, inner in arts:
        out.append({'cls': cls,
                    'tag': 'h2' if '<h2 class="hl">' in inner else 'h3',
                    'box': 'one' if '<div class="one">' in inner else 'body'})
    return out


def story_html(s, lay, lb):
    parts = [f'<article class="{lay["cls"]}" tabindex="0" data-id="{esc(s["id"])}">']
    parts.append(f'      <div class="kick">{esc(s["cat"])}<span>{esc(s["verify"])}</span></div>')
    parts.append(f'      <{lay["tag"]} class="hl">{esc(s["hl"])}</{lay["tag"]}>')
    if s.get('deck') and lay['tag'] == 'h2':
        parts.append(f'      <p class="deck">{esc(s["deck"])}</p>')
    paras = ''.join(f'\n        <p>{esc(p)}</p>' for p in s['paras'])
    if lay['box'] == 'one':
        paras = ''.join(f'\n        <p>{esc(p)}</p>' for p in [' '.join(s['paras'])])
    parts.append(f'      <div class="{lay["box"]}">{paras}\n      </div>')
    parts.append(f'      <div class="more">{esc(lb["more"])}</div>')
    if s.get('nums'):
        cells = ''.join(f'\n        <div><b>{esc(n["b"])}</b><span>{esc(n["s"])}</span></div>' for n in s['nums'][:3])
        parts.append(f'      <div class="fill"><h5>{esc(lb["nums_h5"])}</h5><div class="nums">{cells}\n      </div></div>')
    if s.get('word'):
        w = s['word']
        parts.append(f'      <div class="fill word"><h5>{esc(lb["word_h5"])}</h5><b>{esc(w["term"])}<i>{esc(w["field"])}</i></b><p>{esc(w["def"])}</p></div>')
    if s.get('briefs'):
        lis = ''.join(f'\n        <li>{esc(b["t"])}<span>{esc(b["s"])}</span></li>' for b in s['briefs'])
        parts.append(f'      <div class="fill"><h5>{esc(lb["briefs_h5"])}</h5><ul class="briefs">{lis}\n      </ul><div class="house">{esc(lb["house"])}</div></div>')
    if not s.get("briefs") and s.get("_last") and lb.get("house"):
        parts.append(f'      <div class="house">{esc(lb["house"])}</div>')
    parts.append('    </article>')
    return '\n'.join(parts)


def build_main(spec, tpl, lb):
    lay = layout(tpl)
    st = spec['stories']
    if len(st) != 5 or len(lay) < 5:
        raise SystemExit(f'need exactly 5 stories (got {len(st)}) and a 5-article template (got {len(lay)})')
    idx = ''.join(
        f'\n      <div class="it story" tabindex="0" data-id="{esc(i["id"])}"><b>{esc(i["hl"])}</b><em>{esc(i["em"])}</em><span>{esc(i["tag"])}</span></div>'
        for i in spec['index'])
    rumor = ''.join(f'\n        <div><b>{esc(r["claim"])}</b> <span>{esc(r["resp"])}</span></div>' for r in spec['rumor'])
    nxt = ''.join(f'<b>{esc(r["label"])}</b><span>{esc(r["text"])}</span>' for r in spec['next'])
    return f'''<main class="grid">
    {story_html(st[0], lay[0], lb)}

    {story_html(st[1], lay[1], lb)}

    <aside class="col c1 vr index">
      <h4>{esc(lb["index_h4"])}</h4>{idx}
    </aside>
  </main>

  <hr class="rule-h">

  <section class="strip">
    {story_html(st[2], lay[2], lb)}
    {story_html(st[3], lay[3], lb)}
  </section>

  <hr class="rule-h">

  <section class="strip">
    {story_html({**st[4], "_last": True}, lay[4], lb)}
    <div class="col c2 vr">
      <div class="rumor">
        <h4>{esc(lb["rumor_h4"])}</h4>{rumor}
      </div>
      <div class="next" style="margin-top:14px">
        <h4>{esc(lb["next_h4"])}</h4>
        <div>{nxt}</div>
      </div>
    </div>
  </section>
'''


def popups(spec):
    A = {}
    for s in spec['stories']:
        p = spec['popups'][s['id']]
        A[s['id']] = {'kick': f'{s["cat"]} · {s["verify"]}', 'title': s['hl'], 'what': p['what'], 'why': p['why'], 'me': p['me'],
                      'a': p.get('a', ''), 'b': p.get('b', ''), 'say': p['say'], 'src': p['src']}
    for i in spec['index']:
        p = spec['popups'][i['id']]
        A[i['id']] = {'kick': i.get('kick') or i['tag'], 'title': i['hl'], 'what': p['what'], 'why': p['why'], 'me': p['me'],
                      'a': p.get('a', ''), 'b': p.get('b', ''), 'say': p['say'], 'src': p['src']}
    return A


def dump_obj(name, obj):
    lines = [f'  const {name} = {{']
    items = list(obj.items())
    for n, (k, v) in enumerate(items):
        lines.append('    ' + json.dumps(k, ensure_ascii=False) + ':' + json.dumps(v, ensure_ascii=False) + (',' if n < len(items) - 1 else ''))
    lines.append('  };')
    return '\n'.join(lines) + '\n'


def render(spec, tpl_path):
    tpl = open(tpl_path, encoding='utf-8').read()
    lb = labels(tpl)
    # 직전 호에 없던 칸(숫자·단어·하우스 줄)의 제목은 같은 나라 예전 호에서 찾는다(빈 <h5> 방지, 10/20)
    d = os.path.dirname(tpl_path)
    for f in sorted(os.listdir(d), reverse=True):
        if not re.match(r'\d{4}-\d\d-\d\d\.html$', f) or all(lb[k] for k in ('nums_h5', 'word_h5', 'house')): continue
        old = labels(open(os.path.join(d, f), encoding='utf-8').read())
        for k in ('nums_h5', 'word_h5', 'house'):
            if not lb[k] and old[k]: lb[k] = old[k]
    # 머리(스타일) = <header> 앞까지, 꼬리 = <div class="tip" 부터
    i_head = re.search(r'<div class="sheet"[^>]*>', tpl).start()
    i_tail = tpl.index('<div class="tip"')
    head = tpl[:i_head]
    tail = tpl[i_tail:]
    header = tpl[i_head:tpl.index('<main class="grid">')]
    # 귀퉁이와 날짜줄
    ears = spec['ears']
    cnt = {'n': 0}
    def ear(m):
        e = ears[cnt['n']]
        cnt['n'] += 1
        return f'<div class="{m.group(1)}"><b>{esc(e["v"])}</b>{esc(e["cap"])}</div>'
    header = re.sub(r'<div class="(ear(?: r)?)"><b>[^<]*</b>[^<]*</div>', ear, header, count=2)
    dl = spec['dateline']
    header = re.sub(r'(<div class="dateline"><span>)[^<]*(</span><b>)[^<]*(</b>)',
                    lambda m: m.group(1) + esc(dl['left']) + m.group(2) + esc(dl['date']) + m.group(3), header, count=1)
    main = build_main(spec, tpl, lb)
    # 용어집·팝업 자리: 꼬리의 const A / const G 블록을 새로 쓴다
    A = popups(spec)
    G = spec['glossary']
    tail = re.sub(r'  const A = \{.*?\n  \};\n', lambda m: dump_obj('A', A), tail, count=1, flags=re.S)
    tail = re.sub(r'  const G = \{.*?\n  \};\n', lambda m: dump_obj('G', G), tail, count=1, flags=re.S)
    # 용어 풀이 안내문·푸터는 꼬리 앞(main 뒤 ~ tip 앞)에 있다
    mid = tpl[tpl.index('<div class="glos">'):i_tail]
    title = re.search(r'<title>[^<]*</title>', head)
    return head + header + main + '\n  ' + mid + tail


def check_ids(spec):
    ids = [s['id'] for s in spec['stories']] + [i['id'] for i in spec['index']]
    if len(set(ids)) != len(ids):
        raise SystemExit('duplicate ids')
    miss = [i for i in ids if i not in spec['popups']]
    if miss:
        raise SystemExit(f'popups missing for {miss}')


def meta_of(spec):
    return {'blurb': spec['blurb'], 'markets': spec.get('markets', {}), 'pool': spec['pool']}


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('spec')
    ap.add_argument('--tpl')
    ap.add_argument('--out')
    ap.add_argument('--meta')
    a = ap.parse_args()
    spec = json.load(open(a.spec, encoding='utf-8'))
    check_ids(spec)
    countries = {c['code']: c for c in json.load(open(os.path.join(SITE, 'countries.json'), encoding='utf-8'))}
    reg = spec['region']
    slot = spec.get('slot') or ''
    if slot not in ('', 'pm'):
        raise SystemExit(f'unknown slot {slot!r} (only "pm")')
    tpl = a.tpl or find_template(reg, spec['date'], slot)
    out = a.out or os.path.join(SITE, 'editions', countries[reg]['prefix'] + spec['date'] + ('.' + slot if slot else '') + '.html')
    os.makedirs(os.path.dirname(out), exist_ok=True)
    open(out, 'w', encoding='utf-8').write(render(spec, tpl))
    if a.meta:
        json.dump(meta_of(spec), open(a.meta, 'w', encoding='utf-8'), ensure_ascii=False)
    print('wrote', out)


if __name__ == '__main__':
    main()
