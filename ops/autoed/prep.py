#!/usr/bin/env python3
"""자료 미리 정리(토큰 절감 2·3번).

- sql_region(code, since, until): 에이전트가 D1에 한 번만 던질 압축 SQL — 제목 중복을 SQL에서 합쳐 상위 60건만 돌려준다.
- sql_world(since, until): 세계 뉴스(GLB) 상위 묶음용 SQL.
- compact(rows): GitHub Actions 쪽(Worker /items.json)에서 같은 압축을 파이썬으로 한다.
사용: python prep.py region CODE SINCE UNTIL | world SINCE UNTIL   → SQL 출력
"""
import re, sys


def _dedupe_sql(where, limit):
    # 제목 앞 48자(소문자·기호 제거)로 묶어 서로 다른 매체 수(n)를 센다. 매체가 많은 사건이 위로 온다.
    return f"""SELECT substr(title,1,150) t, group_concat(DISTINCT source) src, count(DISTINCT source) n, min(tier) tier, max(published_at) pub, substr(max(summary),1,110) sm
FROM items WHERE {where} AND batch NOT LIKE '%bf-%'
GROUP BY lower(replace(replace(replace(substr(title,1,48),' ',''),'-',''),',',''))
ORDER BY n DESC, tier ASC, pub DESC LIMIT {limit}"""


def _win(since, until):
    return f"datetime(published_at) >= datetime('{since}') AND datetime(published_at) <= datetime('{until}')"


def sql_region(code, since, until, limit=40):
    return _dedupe_sql(f"region = '{code}' AND {_win(since, until)}", limit)


def sql_world(since, until, limit=70):
    return _dedupe_sql(f"region = 'GLB' AND tier IN ('A','B') AND {_win(since, until)}", limit)


def sql_jev(code, since_h, until_h, limit=8):
    return f"SELECT title, n, front, conf FROM jev WHERE region='{code}' AND hour >= '{since_h}' AND hour <= '{until_h}' ORDER BY front DESC, conf DESC LIMIT {limit}"


def compact(rows, limit=60):
    """rows: items.json 의 dict 목록 → SQL 과 같은 모양으로 합친다."""
    g = {}
    for r in rows:
        k = re.sub(r'[\s,\-]', '', str(r.get('title', '')).lower())[:48]
        e = g.setdefault(k, {'t': str(r.get('title', ''))[:150], 'src': set(), 'tier': 'Z', 'pub': '', 'sm': ''})
        e['src'].add(r.get('source', ''))
        e['tier'] = min(e['tier'], r.get('tier') or 'Z')
        e['pub'] = max(e['pub'], str(r.get('published_at', '')))
        e['sm'] = e['sm'] or str(r.get('summary', ''))[:170]
    out = sorted(g.values(), key=lambda e: (-len(e['src']), e['tier'], e['pub']), reverse=False)
    out.sort(key=lambda e: (-len(e['src']), e['tier']))
    return [{'t': e['t'], 'src': ','.join(sorted(e['src'])), 'n': len(e['src']), 'tier': e['tier'], 'pub': e['pub'], 'sm': e['sm']} for e in out[:limit]]


if __name__ == '__main__':
    a = sys.argv[1:]
    if a and a[0] == 'region':
        print(sql_region(a[1], a[2], a[3]))
    elif a and a[0] == 'world':
        print(sql_world(a[1], a[2]))
    else:
        print(__doc__)
