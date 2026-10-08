#!/usr/bin/env python3
"""데일리드롭 지난 날짜 기사 채우기(backfill).

새 국가판은 RSS 소스를 붙인 날부터만 기사가 쌓이므로, 1호(2026-10-05)부터의 지난 호를 만들 때
구글뉴스 RSS 검색(사이트·날짜 지정)으로 그 나라 주요 언론의 해당 날짜 기사 목록을 받아 Worker /ingest 로 넣는다.
웹검색 도구를 쓰지 않으므로 편집 작업자는 DB(items)를 주재료로 쓰고 검색은 사실 확인용으로만 쓴다.

입력: feed/backfill_request.json  {"regions": ["GB", ...], "dates": ["2026-10-05", ...]}
환경변수: FEED_URL, INGEST_KEY (없으면 feed/backfill_out.json 에만 저장)
"""
from __future__ import annotations

import datetime as dt
import email.utils
import hashlib
import html
import json
import os
import re
import sys
import time
import urllib.parse
import urllib.request
import xml.etree.ElementTree as ET
from pathlib import Path

ROOT = Path(__file__).resolve().parent
UA = "Mozilla/5.0 (compatible; DailyDropBackfill/1.0; +https://dailydrop.kr)"

# 지역별 구글뉴스 언어·국가 설정과 주요 언론 도메인(사이트 지정 검색). lang은 기사 언어.
REGIONS = {
    "GB": {"hl": "en-GB", "gl": "GB", "ceid": "GB:en", "tz": 1, "sites": [("bbc.co.uk", "en"), ("theguardian.com", "en"), ("news.sky.com", "en"), ("ft.com", "en"), ("thetimes.com", "en"), ("independent.co.uk", "en")]},
    "DE": {"hl": "de", "gl": "DE", "ceid": "DE:de", "tz": 2, "sites": [("tagesschau.de", "de"), ("spiegel.de", "de"), ("faz.net", "de"), ("zeit.de", "de"), ("sueddeutsche.de", "de"), ("handelsblatt.com", "de")]},
    "FR": {"hl": "fr", "gl": "FR", "ceid": "FR:fr", "tz": 2, "sites": [("lemonde.fr", "fr"), ("francetvinfo.fr", "fr"), ("lefigaro.fr", "fr"), ("lesechos.fr", "fr"), ("rfi.fr", "fr"), ("france24.com", "fr")]},
    "IN": {"hl": "en-IN", "gl": "IN", "ceid": "IN:en", "tz": 5.5, "sites": [("thehindu.com", "en"), ("indianexpress.com", "en"), ("hindustantimes.com", "en"), ("livemint.com", "en"), ("economictimes.indiatimes.com", "en"), ("ndtv.com", "en")]},
    "AU": {"hl": "en-AU", "gl": "AU", "ceid": "AU:en", "tz": 11, "sites": [("abc.net.au", "en"), ("smh.com.au", "en"), ("theage.com.au", "en"), ("sbs.com.au", "en"), ("afr.com", "en"), ("theguardian.com/australia-news", "en")]},
    "CA": {"hl": "en-CA", "gl": "CA", "ceid": "CA:en", "tz": -4, "sites": [("cbc.ca", "en"), ("theglobeandmail.com", "en"), ("ctvnews.ca", "en"), ("thestar.com", "en"), ("globalnews.ca", "en"), ("ledevoir.com", "fr"), ("ici.radio-canada.ca", "fr")]},
    "TW": {"hl": "zh-TW", "gl": "TW", "ceid": "TW:zh-Hant", "tz": 8, "sites": [("cna.com.tw", "zh-TW"), ("ltn.com.tw", "zh-TW"), ("udn.com", "zh-TW"), ("pts.org.tw", "zh-TW"), ("taipeitimes.com", "en"), ("focustaiwan.tw", "en")]},
    "SG": {"hl": "en-SG", "gl": "SG", "ceid": "SG:en", "tz": 8, "sites": [("channelnewsasia.com", "en"), ("straitstimes.com", "en"), ("businesstimes.com.sg", "en"), ("todayonline.com", "en"), ("mothership.sg", "en"), ("mas.gov.sg", "en")]},
    "BR": {"hl": "pt-BR", "gl": "BR", "ceid": "BR:pt-419", "tz": -3, "sites": [("g1.globo.com", "pt"), ("folha.uol.com.br", "pt"), ("estadao.com.br", "pt"), ("valor.globo.com", "pt"), ("agenciabrasil.ebc.com.br", "pt"), ("oglobo.globo.com", "pt"), ("cnnbrasil.com.br", "pt")]},
    "MX": {"hl": "es-419", "gl": "MX", "ceid": "MX:es-419", "tz": -6, "sites": [("eluniversal.com.mx", "es"), ("milenio.com", "es"), ("elfinanciero.com.mx", "es"), ("proceso.com.mx", "es"), ("jornada.com.mx", "es"), ("eleconomista.com.mx", "es"), ("expansion.mx", "es")]},
    "IT": {"hl": "it", "gl": "IT", "ceid": "IT:it", "tz": 2, "sites": [("ansa.it", "it"), ("rainews.it", "it"), ("corriere.it", "it"), ("repubblica.it", "it"), ("ilsole24ore.com", "it"), ("lastampa.it", "it"), ("ilpost.it", "it")]},
    "ES": {"hl": "es", "gl": "ES", "ceid": "ES:es", "tz": 2, "sites": [("rtve.es", "es"), ("elpais.com", "es"), ("elmundo.es", "es"), ("expansion.com", "es"), ("europapress.es", "es"), ("lavanguardia.com", "es"), ("abc.es", "es")]},
    "NL": {"hl": "nl", "gl": "NL", "ceid": "NL:nl", "tz": 2, "sites": [("nos.nl", "nl"), ("nu.nl", "nl"), ("volkskrant.nl", "nl"), ("nrc.nl", "nl"), ("fd.nl", "nl"), ("telegraaf.nl", "nl"), ("trouw.nl", "nl")]},
    "CH": {"hl": "de", "gl": "CH", "ceid": "CH:de", "tz": 2, "sites": [("srf.ch", "de"), ("nzz.ch", "de"), ("tagesanzeiger.ch", "de"), ("rts.ch", "fr"), ("letemps.ch", "fr"), ("rsi.ch", "it"), ("swissinfo.ch/eng", "en")]},
}


def fetch(url: str) -> bytes:
    req = urllib.request.Request(url, headers={"User-Agent": UA, "Accept-Language": "en"})
    with urllib.request.urlopen(req, timeout=30) as r:
        return r.read()


def items_for(region: str, date: str) -> list[dict]:
    cfg = REGIONS[region]
    d = dt.date.fromisoformat(date)
    after, before = (d - dt.timedelta(days=1)).isoformat(), (d + dt.timedelta(days=1)).isoformat()
    # 현지 날짜 하루(00:00~24:00)를 UTC로
    off = dt.timedelta(hours=cfg["tz"])
    lo = dt.datetime.combine(d, dt.time(0), tzinfo=dt.timezone.utc) - off
    hi = lo + dt.timedelta(days=1)
    out, seen = [], set()
    for site, lang in cfg["sites"]:
        q = f"site:{site} after:{after} before:{before}"
        url = "https://news.google.com/rss/search?" + urllib.parse.urlencode({"q": q, "hl": cfg["hl"], "gl": cfg["gl"], "ceid": cfg["ceid"]})
        try:
            root = ET.fromstring(fetch(url))
        except Exception as e:  # noqa: BLE001
            print(f"  {region} {date} {site}: {e}", file=sys.stderr)
            continue
        n = 0
        for it in root.iter("item"):
            title = (it.findtext("title") or "").strip()
            link = (it.findtext("link") or "").strip()
            pub = it.findtext("pubDate")
            src = it.find("source")
            src_name = (src.text if src is not None and src.text else site).strip()
            try:
                when = email.utils.parsedate_to_datetime(pub) if pub else None
            except Exception:  # noqa: BLE001
                when = None
            if not title or not link or when is None or not (lo <= when < hi):
                continue
            title = re.sub(r"\s+-\s+" + re.escape(src_name) + r"$", "", title)
            key = hashlib.sha1(link.encode()).hexdigest()[:20]
            if key in seen:
                continue
            seen.add(key)
            desc = html.unescape(re.sub(r"<[^>]+>", " ", it.findtext("description") or "")).strip()
            out.append({"id": key, "title": title[:300], "link": link[:1000], "source": f"{src_name} (Google News 경유·지난 날짜)", "field": "기타", "tier": "B",
                        "published_at": when.astimezone(dt.timezone.utc).isoformat(), "summary": desc[:300] or None, "region": region, "lang": lang})
            n += 1
        print(f"  {region} {date} {site}: {n}", file=sys.stderr)
        time.sleep(1.0)
    return out


def main() -> int:
    req = json.loads((ROOT / "backfill_request.json").read_text(encoding="utf-8"))
    url, key = os.environ.get("FEED_URL", "").rstrip("/"), os.environ.get("INGEST_KEY", "")
    total = {}
    dump = []
    for region in req["regions"]:
        for date in req["dates"]:
            items = items_for(region, date)
            total[f"{region}:{date}"] = len(items)
            if not items:
                continue
            payload = {"batch": f"{date}T00:bf-{region}", "started_at": dt.datetime.now(dt.timezone.utc).isoformat(), "n_fetched": len(items), "n_sources": len(REGIONS[region]["sites"]), "errors": [], "items": items}
            if url and key:
                r = urllib.request.Request(url + "/ingest", data=json.dumps(payload, ensure_ascii=False).encode(), headers={"Content-Type": "application/json", "Authorization": "Bearer " + key, "User-Agent": UA}, method="POST")
                with urllib.request.urlopen(r, timeout=60) as resp:
                    print(f"{region} {date}: ingest {resp.read().decode()[:200]}", file=sys.stderr)
            else:
                dump.append(payload)
    print(json.dumps(total, ensure_ascii=False, indent=1))
    if dump:
        (ROOT / "backfill_out.json").write_text(json.dumps(dump, ensure_ascii=False), encoding="utf-8")
    return 0


if __name__ == "__main__":
    sys.exit(main())
