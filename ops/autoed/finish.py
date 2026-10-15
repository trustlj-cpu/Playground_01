#!/usr/bin/env python3
"""에이전트가 쓴 판을 검증·등록·빌드·push. 사용: finish.py CODE:DATE [CODE:DATE ...]  (meta: scratchpad 1016/<CODE>_<DATE>_meta.json 또는 --meta-dir)"""
import datetime as dt, json, os, sys
from zoneinfo import ZoneInfo
sys.path.insert(0, os.path.dirname(__file__))
import run
META = os.environ.get('DD_META_DIR', '/tmp/claude-0/-home-user-Playground-01/fd3bace2-4028-5ada-8da1-2ad9db95cb51/scratchpad/ed/1016')
C = {c['code']: c for c in run.jload(os.path.join(run.SITE, 'countries.json'))}
now = dt.datetime.now(dt.timezone.utc)
for a in sys.argv[1:]:
    code, date = a.split(':'); c = C[code]
    path = os.path.join(run.SITE, 'editions', c['prefix'] + date + '.html')
    try:
        info = run.validate(path, 30000)
        meta = json.load(open(f'{META}/{code}_{date}_meta.json'))
    except Exception as e:
        print('SKIP', a, e); continue
    day = dt.date.fromisoformat(date)
    six = dt.datetime.combine(day, dt.time(6), ZoneInfo(c['tz'])).astimezone(dt.timezone.utc)
    job = {'c': c, 'date': date, 'no': (day - run.NO1).days + 1, 'publish_at': six.strftime('%Y-%m-%dT%H:%M:%SZ') if six > now else None}
    snap = run.snapshot(); run.register(job, meta); ok, log = run.build_ok()
    if not ok:
        run.restore(snap); print('BUILD FAIL', a, log); continue
    run.commit(f"editions: {code} {date} No.{job['no']}", force=True); print('OK', a, info, job['publish_at'] or 'immediate')
