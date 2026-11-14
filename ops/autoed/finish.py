#!/usr/bin/env python3
"""에이전트가 쓴 판을 검증·등록·빌드·push. 사용: finish.py CODE:DATE[:pm] [CODE:DATE[:pm] ...]  (meta: scratchpad 1016/<CODE>_<DATE>_meta.json 또는 DD_META_DIR)
석간은 CODE:DATE:pm (파일 CODE_DATE_pm_spec.json / _meta.json → site/editions/<prefix><date>.pm.html, publish_at = 현지 18:00, 호수 = 그날 조간과 같음)."""
import datetime as dt, json, os, sys
from zoneinfo import ZoneInfo
sys.path.insert(0, os.path.dirname(__file__))
import run
META = os.environ.get('DD_META_DIR', '/tmp/claude-0/-home-user-Playground-01/fd3bace2-4028-5ada-8da1-2ad9db95cb51/scratchpad/ed/1016')
C = {c['code']: c for c in run.jload(os.path.join(run.SITE, 'countries.json'))}
now = dt.datetime.now(dt.timezone.utc)
for a in sys.argv[1:]:
    parts = a.split(':'); code, date = parts[0], parts[1]; c = C[code]
    slot = parts[2] if len(parts) > 2 else ''
    if slot not in ('', 'pm') or len(parts) > 3:
        print('SKIP', a, 'form is CODE:DATE or CODE:DATE:pm'); continue
    tag = '_pm' if slot else ''; dk = date + ('-pm' if slot else '')
    path = os.path.join(run.SITE, 'editions', c['prefix'] + date + ('.pm' if slot else '') + '.html')
    sp = f'{META}/{code}_{date}{tag}_spec.json'
    if os.path.exists(sp):  # 새 방식: spec JSON → render.py 로 HTML·meta 생성
        import subprocess
        r = subprocess.run([sys.executable, os.path.join(os.path.dirname(__file__), 'render.py'), sp, '--meta', f'{META}/{code}_{date}{tag}_meta.json'], capture_output=True, text=True)
        if r.returncode:
            print('RENDER FAIL', a, (r.stderr or r.stdout)[-300:]); continue
        ex = json.load(open(sp, encoding='utf-8')).get('extras')
        if ex:  # 원문 링크·인플루언서 → site/extras (build.js 가 붙인다)
            ef = os.path.join(run.SITE, 'extras', c['prefix'] + dk + '.json'); os.makedirs(os.path.dirname(ef), exist_ok=True)
            open(ef, 'w', encoding='utf-8').write(json.dumps({'src': ex.get('src', {}), 'infl': ex.get('infl', [])}, ensure_ascii=False, indent=1) + '\n')
    try:
        info = run.validate(path, 30000)
        meta = json.load(open(f'{META}/{code}_{date}{tag}_meta.json'))
    except Exception as e:
        print('SKIP', a, e); continue
    day = dt.date.fromisoformat(date)
    six = dt.datetime.combine(day, dt.time(18 if slot else 6), ZoneInfo(c['tz'])).astimezone(dt.timezone.utc)  # 조간 06:00 · 석간 18:00 (현지)
    no = (day - run.NO1).days + 1  # 석간도 그날 조간과 같은 호수
    for x in run.jload(os.path.join(run.SITE, 'editions.json')):
        if slot and x['date'] == date and (x.get('region') or 'KR') == code and not x.get('slot'): no = x['no']
    job = {'c': c, 'date': date, 'slot': slot, 'no': no, 'publish_at': six.strftime('%Y-%m-%dT%H:%M:%SZ') if six > now else None}
    snap = run.snapshot(); run.register(job, meta); ok, log = run.build_ok()
    if not ok:
        run.restore(snap); print('BUILD FAIL', a, log); continue
    run.commit(f"editions: {code} {date}{' pm' if slot else ''} No.{job['no']}", force=True); print('OK', a, info, job['publish_at'] or 'immediate')
