import os, hashlib, json, sys
from pathlib import Path
import yaml
token = os.environ.pop('CLOUDFLARE_API_TOKEN', '')
account = os.environ.pop('CLOUDFLARE_ACCOUNT_ID', '')
if not token or not account:
    raise SystemExit('Required deployment secrets are missing; no fallback commit will be made.')
key = hashlib.sha256(f'dailydrop-ingest:{account}:{token}'.encode()).hexdigest()[:48]
print('::add-mask::' + key)
os.environ['INGEST_KEY'] = key
del token, key
collector = Path(__file__).resolve().parents[2] / 'collector'
os.chdir(collector)
source_path = Path('issuedrop/sources.yaml')
from source_policy import prepare_sources
cfg = yaml.safe_load(source_path.read_text())
candidates = yaml.safe_load((Path(__file__).parent / 'sources.yaml').read_text())['sources']
policy = json.loads((Path(__file__).parent / 'source_policy.json').read_text())
extra_path = Path('feed/sources_extra.yaml')
extra = (yaml.safe_load(extra_path.read_text()) or {}).get('sources', []) if extra_path.exists() else []
cfg['sources'], notices = prepare_sources(cfg['sources'], extra, candidates, policy)
# Only the disposable Actions checkout is changed; upstream Claude originals stay intact.
source_path.write_text(yaml.safe_dump(cfg, allow_unicode=True))
extra_path.write_text(yaml.safe_dump({'sources': []}))
for notice in notices:
    print(notice, file=sys.stderr)
if os.environ.get('GITHUB_STEP_SUMMARY'):
    with open(os.environ['GITHUB_STEP_SUMMARY'], 'a') as summary:
        summary.write('### Source policy\n\n' + '\n'.join('- ' + n for n in notices) + '\n')
sys.path.insert(0, str(Path('feed').resolve()))
import collect_fast
# Keep same-title reports from different publishers for later comparison.
def keep_sources(items):
    seen_url, seen_title, out = set(), set(), []
    for it in items:
        url = collect_fast.base.canon_url(it['link'])
        title = (it['source'], collect_fast.base.norm_title(it['title']))
        if url in seen_url or title in seen_title:
            continue
        seen_url.add(url); seen_title.add(title); out.append(it)
    return out
collect_fast.base.dedupe = keep_sources
import contextlib, io, re
log = io.StringIO()
try:
    with contextlib.redirect_stderr(log):
        result = collect_fast.main()
finally:
    print(log.getvalue(), file=sys.stderr, end='')
if result:
    raise SystemExit(result)
match = re.search(r'^batch=(\d{4}-\d{2}-\d{2}T\d{2}:\d{2})\s', log.getvalue(), re.M)
if not match:
    raise SystemExit('Collector did not report its batch.')
with open(os.environ['GITHUB_OUTPUT'], 'a') as out:
    out.write('batch=' + match.group(1) + '\n')
