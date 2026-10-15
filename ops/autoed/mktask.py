#!/usr/bin/env python3
"""새 방식 작업 지시서 생성: python mktask.py CODE DATE [--until ISO] [--world 파일] [--dir 폴더]
지시서는 짧다(SPEC.md 를 읽게 하고 SQL 만 준다). 에이전트는 spec JSON 을 쓰고 check_spec.py 를 통과시킨다."""
import argparse, datetime as dt, json, os, sys
from zoneinfo import ZoneInfo
sys.path.insert(0, os.path.dirname(__file__))
import prep, run

ap = argparse.ArgumentParser()
ap.add_argument('code'); ap.add_argument('date')
ap.add_argument('--until'); ap.add_argument('--world'); ap.add_argument('--dir', required=True)
a = ap.parse_args()
C = {c['code']: c for c in json.load(open(os.path.join(run.SITE, 'countries.json'), encoding='utf-8'))}
c = C[a.code]
day = dt.date.fromisoformat(a.date)
five = dt.datetime.combine(day, dt.time(5), ZoneInfo(c['tz'])).astimezone(dt.timezone.utc)
now = dt.datetime.now(dt.timezone.utc)
until = dt.datetime.fromisoformat(a.until.replace('Z', '+00:00')) if a.until else min(five, now)
since = until - dt.timedelta(hours=30)
f = lambda t: t.strftime('%Y-%m-%dT%H:%M:%S')
keys = ','.join("'%s'" % t[1] for t in c['tape'])
no = (day - run.NO1).days + 1
out = os.path.join(a.dir, f'{a.code}_{a.date}_spec.json')
world = f'\nWorld stories to reuse (adapt, do not re-research): {a.world}\n' if a.world else ''
txt = f"""# {a.code} No. {no} ({a.date}) — {run.LANG[a.code]}

Read /home/user/Playground_01/ops/autoed/SPEC.md and follow it exactly. Do not read any template or edition HTML.
Edition: region {a.code}, date {a.date}, No. {no}, language {run.LANG[a.code]}, time zone {c['tz']}. Window: {f(since)}Z to {f(until)}Z (≈05:00 local). Nothing later except "what to watch today".{world}
Queries (Cloudflare MCP D1, database_id 0f239386-f7cf-42ed-838d-46eb896bea87; run exactly these, nothing else):
1) Region items (titles merged across outlets; n = number of outlets):
{prep.sql_region(a.code, f(since), f(until))}
2) Jev ranking: {prep.sql_jev(a.code, f(since)[:13], f(until)[:13])}
3) Tape quotes (use only completed closes with ts inside the window, else "—"): SELECT k,v,chg,ts FROM quotes WHERE k IN ({keys})

Output: write {out} then run `python3 /home/user/Playground_01/ops/autoed/check_spec.py {out}` until it prints ok. Do not render, commit or edit any other file.
Final report: 2 lines (lead headline + ears), nothing else.
"""
os.makedirs(a.dir, exist_ok=True)
p = os.path.join(a.dir, f'{a.code}_{a.date}_task.md')
open(p, 'w', encoding='utf-8').write(txt)
print(p)
