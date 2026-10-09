#!/usr/bin/env python3
"""데일리드롭 10분 수집기 (feed).

issuedrop/collect.py 의 소스 목록·파서·정규화를 그대로 재사용해서 10분마다 돌며,
최근 WINDOW_HOURS(기본 3시간) 항목을 모아 Worker의 POST /ingest 로 보낸다.
Worker 쪽 D1이 링크 해시로 중복을 걸러내므로 수집기는 상태를 가질 필요가 없다.

환경변수
  FEED_URL     Worker 주소 (예: https://dailydrop-feed.xxx.workers.dev). 없으면 feed/latest.json 에만 저장.
  INGEST_KEY   Worker와 공유하는 키.
  WINDOW_HOURS 수집 창(시간). 기본 3.
"""
from __future__ import annotations

import concurrent.futures as cf
import datetime as dt
import hashlib
import json
import os
import re
import sys
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parent
sys.path.insert(0, str(ROOT.parent / "issuedrop"))
os.environ.setdefault("WINDOW_HOURS", "3")
import collect as base  # noqa: E402  (issuedrop/collect.py)
import yaml  # noqa: E402

base.MAX_PER_SOURCE = 30


def item_id(link: str) -> str:
    return hashlib.sha1(base.canon_url(link).encode()).hexdigest()[:20]


# 지역 → 기본 언어(소스 yaml에 lang이 없을 때). KR 한국어, JP 일본어, DE 독일어, FR 불어, TW 번체 중국어,
# BR 포르투갈어, MX·ES 스페인어, IT 이탈리아어, NL 네덜란드어, 그 외(SG 포함) 영어
# (CA·IN·CH는 영어/불어·힌디, 독/불/이탈리아어가 섞이므로 소스별 lang 사용)
LANG_BY_REGION = {"KR": "ko", "JP": "ja", "CN": "zh", "DE": "de", "FR": "fr", "TW": "zh-TW",
                  "BR": "pt", "MX": "es", "ES": "es", "IT": "it", "NL": "nl"}

def future_none(p, now):
    """발행 시각이 1시간 넘게 미래면 버린다(연방의회 의사일정처럼 '예정일'을 발행일로 쓰는 피드가 목록 맨 위로 뜨는 것 방지)."""
    if not p:
        return None
    try:
        try:
            t = dt.datetime.fromisoformat(str(p).strip().replace("Z", "+00:00"))
        except ValueError:
            import email.utils
            t = email.utils.parsedate_to_datetime(str(p).strip())
        if t.tzinfo is None:
            t = t.replace(tzinfo=dt.timezone.utc)
        return None if t > now + dt.timedelta(hours=1) else p
    except Exception:
        return p


def main() -> int:
    now = dt.datetime.now(dt.timezone.utc)
    batch = now.strftime("%Y-%m-%dT%H:") + f"{now.minute // 10 * 10:02d}"
    cfg = yaml.safe_load((ROOT.parent / "issuedrop" / "sources.yaml").read_text(encoding="utf-8"))
    extra = ROOT / "sources_extra.yaml"  # Codex가 추가하는 소스는 여기에
    sources = list(cfg["sources"])
    if extra.exists():
        sources += (yaml.safe_load(extra.read_text(encoding="utf-8")) or {}).get("sources", [])

    items, errors, ok = [], [], 0
    with cf.ThreadPoolExecutor(max_workers=16) as ex:
        for src, out, st in ex.map(base.collect_source, sources):
            if st == "ok":
                ok += 1
            else:
                errors.append(f"{src['id']}: {st}")
            items.extend(out)
    n_fetched = len(items)
    items = base.dedupe(items)
    payload_items = [{
        "id": item_id(it["link"]), "title": it["title"][:300], "link": it["link"][:1000],
        "source": it["source_name"], "field": it["cat"], "tier": it["tier"],
        "published_at": future_none(it["published"], now), "summary": (it.get("summary") or "")[:300] or None,
        "region": it.get("region") or "GLB", "lang": it.get("lang") or LANG_BY_REGION.get(it.get("region") or "GLB", "en"),
    } for it in items]
    payload = {"batch": batch, "started_at": now.isoformat(), "n_fetched": n_fetched,
               "n_sources": len(sources), "n_ok": ok, "errors": errors[:40], "items": payload_items}
    print(f"batch={batch} sources={ok}/{len(sources)} fetched={n_fetched} unique={len(payload_items)}", file=sys.stderr)

    url, key = os.environ.get("FEED_URL", "").rstrip("/"), os.environ.get("INGEST_KEY", "")
    if url and key:
        req = urllib.request.Request(url + "/ingest", data=json.dumps(payload, ensure_ascii=False).encode(),
                                     headers={"Content-Type": "application/json", "Authorization": "Bearer " + key,
                                              "User-Agent": base.UA}, method="POST")
        with urllib.request.urlopen(req, timeout=60) as r:
            print("ingest:", r.read().decode()[:300], file=sys.stderr)
    else:
        (ROOT / "latest.json").write_text(json.dumps(payload, ensure_ascii=False, indent=1), encoding="utf-8")
        print("FEED_URL 없음 → feed/latest.json 저장", file=sys.stderr)
    return 0


if __name__ == "__main__":
    sys.exit(main())
