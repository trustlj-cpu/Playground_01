"""Apply reviewed policy to a disposable collector configuration, never upstream originals."""
from copy import deepcopy


def prepare_sources(known, extra, candidates, policy):
    result, notices = [], []
    ids, urls = set(), set()
    for original in known + extra:
        src = deepcopy(original)
        sid = src['id']
        if sid in policy.get('disabled', {}):
            notices.append(f"PAUSED {sid}: {policy['disabled'][sid]}")
            continue
        change = policy.get('overrides', {}).get(sid)
        if change:
            src.update(change['set'])
            if src['type'] == 'gnews':
                src.pop('url', None)
            notices.append(f"UPDATED {sid}: {change['reason']}")
        if sid in ids:
            raise ValueError(f"Duplicate source id: {sid}")
        ids.add(sid)
        if src.get('url'):
            urls.add(src['url'])
        result.append(src)
    for original in candidates:
        src = deepcopy(original)
        if src['id'] in ids or (src.get('url') and src['url'] in urls):
            continue
        ids.add(src['id'])
        if src.get('url'):
            urls.add(src['url'])
        result.append(src)
    return result, notices
