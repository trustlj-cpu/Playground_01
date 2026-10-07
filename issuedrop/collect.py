#!/usr/bin/env python3
"""데일리드롭 이슈 수집기.

sources.yaml의 RSS/구글뉴스/공개 API를 모두 긁어서
 1) 항목 정규화 → 2) URL·제목 중복 제거 → 3) 제목 키워드로 이슈 묶기(독립 소스 수 계산)
 4) 신뢰 등급 부여: A/B 소스 2개 이상이면 '확인', 1개면 '단일소스', D(커뮤니티·트렌드)만 있으면 '미확인'
 5) out/<날짜>/brief.md + items.json 생성. 실패한 소스도 리포트에 남긴다.

표준 라이브러리만 사용(feedparser 불필요)해서 GitHub Actions 기본 러너에서 바로 돈다.
"""
from __future__ import annotations

import concurrent.futures as cf
import datetime as dt
import hashlib
import json
import os
import re
import sys
import urllib.parse
import urllib.request
import xml.etree.ElementTree as ET
from collections import Counter, defaultdict
from pathlib import Path

import yaml

ROOT = Path(__file__).resolve().parent
UA = "Mozilla/5.0 (compatible; DailyDropCollector/0.1; +https://github.com/trustlj-cpu/Playground_01)"
TIMEOUT = 20
MAX_PER_SOURCE = 40
NOW = dt.datetime.now(dt.timezone.utc)
WINDOW_HOURS = int(os.environ.get("WINDOW_HOURS", "36"))

NS = {"atom": "http://www.w3.org/2005/Atom", "dc": "http://purl.org/dc/elements/1.1/",
      "media": "http://search.yahoo.com/mrss/", "rdf": "http://www.w3.org/1999/02/22-rdf-syntax-ns#",
      "rss1": "http://purl.org/rss/1.0/"}

STOP = set("""the a an and or of to in on for with by from at as is are was be this that it its vs via amid after before over under
into about says said new will may could would should has have had not no yes up down out more most less than then
및 등 의 을 를 이 가 은 는 에 에서 로 으로 와 과 도 만 더 또 및 vs 대한 위한 관련 통해 대해 속보 단독 종합 영상 포토 사진 기자
""".split())


# ───────────────────────── fetch
def fetch(url: str) -> bytes:
    req = urllib.request.Request(url, headers={"User-Agent": UA, "Accept": "*/*"})
    with urllib.request.urlopen(req, timeout=TIMEOUT) as r:
        return r.read()


def gnews_url(q: str, hl: str = "ko") -> str:
    if hl == "en":
        return "https://news.google.com/rss/search?q=" + urllib.parse.quote(q) + "&hl=en-US&gl=US&ceid=US:en"
    return "https://news.google.com/rss/search?q=" + urllib.parse.quote(q) + "&hl=ko&gl=KR&ceid=KR:ko"


# ───────────────────────── parse
def _text(el, *paths):
    for p in paths:
        x = el.find(p, NS)
        if x is not None and (x.text or "").strip():
            return re.sub(r"\s+", " ", x.text).strip()
    return ""


def _parse_date(s: str) -> dt.datetime | None:
    if not s:
        return None
    from email.utils import parsedate_to_datetime
    try:
        d = parsedate_to_datetime(s)
        return d if d.tzinfo else d.replace(tzinfo=dt.timezone.utc)
    except Exception:
        pass
    for fmt in ("%Y-%m-%dT%H:%M:%S%z", "%Y-%m-%dT%H:%M:%S.%f%z", "%Y-%m-%dT%H:%M:%SZ", "%Y-%m-%d %H:%M:%S", "%Y-%m-%d"):
        try:
            d = dt.datetime.strptime(s.strip().replace("Z", "+0000") if "Z" in s else s.strip(), fmt)
            return d if d.tzinfo else d.replace(tzinfo=dt.timezone.utc)
        except Exception:
            continue
    return None


def parse_feed(raw: bytes) -> list[dict]:
    root = ET.fromstring(raw)
    items = []
    tag = root.tag.lower()
    if tag.endswith("feed"):  # Atom
        for e in root.findall("atom:entry", NS):
            link = ""
            for l in e.findall("atom:link", NS):
                if l.get("rel") in (None, "alternate"):
                    link = l.get("href", ""); break
            items.append({"title": _text(e, "atom:title"), "link": link,
                          "published": _text(e, "atom:published", "atom:updated"),
                          "summary": _text(e, "atom:summary", "atom:content")})
    elif tag.endswith("rdf"):  # RSS 1.0
        for e in root.findall("rss1:item", NS):
            items.append({"title": _text(e, "rss1:title"), "link": _text(e, "rss1:link"),
                          "published": _text(e, "dc:date"), "summary": _text(e, "rss1:description")})
    else:  # RSS 2.0
        ch = root.find("channel")
        for e in (ch.findall("item") if ch is not None else root.iter("item")):
            items.append({"title": _text(e, "title"), "link": _text(e, "link"),
                          "published": _text(e, "pubDate", "dc:date"), "summary": _text(e, "description")})
    return items


def parse_json(raw: bytes, parser: str) -> list[dict]:
    data = json.loads(raw)
    out = []
    if parser == "polymarket":
        for ev in data:
            out.append({"title": f"[예측] {ev.get('title','')} — 24h 거래량 ${float(ev.get('volume24hr') or 0):,.0f}",
                        "link": "https://polymarket.com/event/" + ev.get("slug", ""), "published": ev.get("updatedAt", ""), "summary": ""})
    elif parser == "kalshi":
        for ev in data.get("events", []):
            out.append({"title": f"[예측] {ev.get('title','')} ({ev.get('category','')})",
                        "link": "https://kalshi.com/markets/" + ev.get("event_ticker", "").lower(), "published": "", "summary": ev.get("sub_title", "")})
    elif parser == "coingecko":
        for c in data:
            chg = c.get("price_change_percentage_24h") or 0
            out.append({"title": f"[코인] {c.get('name')} ${c.get('current_price'):,} ({chg:+.1f}% 24h)",
                        "link": "https://www.coingecko.com/en/coins/" + c.get("id", ""), "published": c.get("last_updated", ""), "summary": ""})
    return out


def parse_dart(raw: bytes) -> list[dict]:
    data = json.loads(raw)
    return [{"title": f"[공시] {d.get('corp_name')} — {d.get('report_nm')}",
             "link": "https://dart.fss.or.kr/dsaf001/main.do?rcpNo=" + d.get("rcept_no", ""),
             "published": d.get("rcept_dt", ""), "summary": d.get("flr_nm", "")} for d in data.get("list", [])]


# ───────────────────────── normalize / dedupe / cluster
def norm_title(t: str) -> str:
    t = re.sub(r"\[.*?\]|\(.*?\)|【.*?】", " ", t)
    t = re.sub(r"\s+[-|–—]\s+[^-|–—]{2,20}$", "", t)  # 끝의 ' - 매체명' 제거
    return re.sub(r"\s+", " ", t).strip().lower()


def tokens(t: str) -> set[str]:
    words = re.findall(r"[가-힣]{2,}|[A-Za-z][A-Za-z0-9\-]{2,}|\d{2,}", t)
    return {w.lower() for w in words if w.lower() not in STOP}


def clean_link(link: str) -> str:
    """피드가 흘린 찌꺼기 제거: 마크다운 잔재 '](...)', 앞뒤 공백·따옴표, http(s) 아닌 값."""
    link = (link or "").strip().strip('"\'')
    link = re.split(r"\]\(|\s", link, 1)[0]
    return link if re.match(r"^https?://[^\s<>]+$", link) else ""


def collect_source(src: dict) -> tuple[dict, list[dict], str]:
    try:
        if src["type"] == "gnews":
            url = gnews_url(src["q"], src.get("hl", "ko"))
        else:
            url = src["url"]
        if src["type"] == "dart":
            key = os.environ.get(src.get("needs_key", ""), "")
            if not key:
                return src, [], "skipped(no key)"
            today = NOW.astimezone(dt.timezone(dt.timedelta(hours=9))).strftime("%Y%m%d")
            url = f"{url}?crtfc_key={key}&bgn_de={today}&page_count=50"
        raw = fetch(url)
        if src["type"] == "json":
            items = parse_json(raw, src["parser"])
        elif src["type"] == "dart":
            items = parse_dart(raw)
        else:
            items = parse_feed(raw)
        out = []
        for it in items[:MAX_PER_SOURCE]:
            it["link"] = clean_link(it.get("link", ""))
            if not it["title"] or not it["link"]:
                continue
            d = _parse_date(it["published"])
            if d and (NOW - d).total_seconds() > WINDOW_HOURS * 3600:
                continue
            out.append({**it, "source": src["id"], "source_name": src["name"], "cat": src["cat"], "tier": src["tier"],
                        "region": src.get("region", ""), "published": d.isoformat() if d else "",
                        "summary": re.sub(r"<[^>]+>", " ", it.get("summary", ""))[:300]})
        return src, out, "ok"
    except Exception as e:  # noqa: BLE001
        return src, [], f"error: {type(e).__name__}: {str(e)[:80]}"


TRACK = re.compile(r"^(utm_|fbclid$|gclid$|igshid$|ref$|ref_src$|source$|cmpid$|sr_share$|xy$)", re.I)  # xy=: FinancialJuice 배포 채널 표시(1/rss) — 같은 기사가 두 번 저장되던 원인


def canon_url(link: str) -> str:
    """중복 판정용 URL 정규화. 호스트만 소문자, 추적 파라미터만 제거(YouTube v=, DART rcpNo= 같은 식별 쿼리는 유지)."""
    p = urllib.parse.urlsplit(link.strip())
    q = [(k, v) for k, v in urllib.parse.parse_qsl(p.query, keep_blank_values=True) if not TRACK.match(k)]
    q.sort()
    return urllib.parse.urlunsplit((p.scheme.lower(), p.netloc.lower(), p.path.rstrip("/") or "/", urllib.parse.urlencode(q), ""))


def dedupe(items: list[dict]) -> list[dict]:
    seen_url, seen_title, out = set(), set(), []
    for it in items:
        u = canon_url(it["link"])
        nt = norm_title(it["title"])
        h = hashlib.md5(nt.encode()).hexdigest()
        if u in seen_url or h in seen_title:
            continue
        seen_url.add(u); seen_title.add(h); out.append(it)
    return out


SYN = {"한은": "한국은행", "연준": "fed", "fomc": "fed", "미연준": "fed", "코스피": "kospi", "환율": "원달러",
       "국내증시": "코스피", "美": "미국", "中": "중국", "日": "일본", "trump": "트럼프", "bitcoin": "비트코인", "btc": "비트코인",
       "samsung": "삼성전자", "삼성": "삼성전자", "nvidia": "엔비디아", "openai": "오픈ai", "물가상승률": "물가", "소비자물가": "물가"}


def shared(a: set[str], b: set[str]) -> int:
    """정확 일치 + 한국어 부분 일치(소비자물가⊃물가) + 동의어."""
    a2 = {SYN.get(x, x) for x in a}; b2 = {SYN.get(x, x) for x in b}
    n = len(a2 & b2)
    for x in a2 - b2:
        if len(x) >= 2 and any((x in y or y in x) and abs(len(x) - len(y)) <= 4 for y in b2 - a2):
            n += 1
    return n


def cluster(items: list[dict], min_shared: int = 2) -> list[dict]:
    """제목 토큰이 min_shared개 이상 겹치면 같은 이슈. 단순하지만 소스 수 세기엔 충분."""
    toks = [tokens(norm_title(it["title"])) for it in items]
    parent = list(range(len(items)))

    def find(x):
        while parent[x] != x:
            parent[x] = parent[parent[x]]; x = parent[x]
        return x

    for i in range(len(items)):
        if len(toks[i]) < 2:
            continue
        for j in range(i + 1, len(items)):
            s = shared(toks[i], toks[j])
            if (s >= min_shared and items[i]["cat"] == items[j]["cat"]) or s >= 3:
                parent[find(i)] = find(j)
    groups = defaultdict(list)
    for i in range(len(items)):
        groups[find(i)].append(items[i])
    clusters = []
    for g in groups.values():
        srcs = {x["source"] for x in g}
        tiers = {x["tier"] for x in g}
        ab = {x["source"] for x in g if x["tier"] in "AB"}
        if len(ab) >= 2:
            status = "✅ 확인(독립 소스 2+)"
        elif len(ab) == 1:
            status = "🟡 단일 소스"
        elif tiers & {"C"}:
            status = "🟠 분석/블로그 — 1차 자료 대조 필요"
        else:
            status = "🔴 미확인(커뮤니티·트렌드) — 팩트체크 필수"
        kw = Counter()
        for x in g:
            kw.update(tokens(norm_title(x["title"])))
        g.sort(key=lambda x: (x["tier"], x["published"]), reverse=False)
        clusters.append({"size": len(g), "sources": sorted(srcs), "status": status,
                         "keywords": [k for k, _ in kw.most_common(6)], "cat": Counter(x["cat"] for x in g).most_common(1)[0][0],
                         "lead": g[0], "items": g})
    clusters.sort(key=lambda c: (-len(c["sources"]), -c["size"]))
    return clusters


# ───────────────────────── report
def write_report(clusters, items, status_rows, outdir: Path):
    kst = NOW.astimezone(dt.timezone(dt.timedelta(hours=9)))
    outdir.mkdir(parents=True, exist_ok=True)
    (outdir / "items.json").write_text(json.dumps(items, ensure_ascii=False, indent=1), encoding="utf-8")
    ok = sum(1 for r in status_rows if r[2] == "ok")
    L = [f"# 데일리드롭 이슈 수집 — {kst:%Y-%m-%d %H:%M} KST", "",
         f"소스 {len(status_rows)}개 중 {ok}개 성공 · 항목 {len(items)}개 · 이슈 묶음 {len(clusters)}개 · 최근 {WINDOW_HOURS}시간", "",
         "## 1. 여러 소스가 동시에 다루는 이슈 (독립 소스 수 순)", ""]
    for c in [c for c in clusters if len(c["sources"]) >= 2][:40]:
        L.append(f"### {c['lead']['title']}")
        L.append(f"- 상태: {c['status']} · 분야: {c['cat']} · 소스 {len(c['sources'])}개: {', '.join(c['sources'])}")
        L.append(f"- 키워드: {', '.join(c['keywords'])}")
        for x in c["items"][:6]:
            L.append(f"  - [{x['tier']}] {x['source_name']}: [{x['title']}]({x['link']})")
        L.append("")
    L += ["## 2. 분야별 단일 소스 헤드라인 (상위 8개씩)", ""]
    by_cat = defaultdict(list)
    for c in clusters:
        if len(c["sources"]) == 1:
            by_cat[c["cat"]].append(c["lead"])
    for cat, lst in sorted(by_cat.items()):
        L.append(f"### {cat}")
        for x in lst[:8]:
            L.append(f"- [{x['tier']}] {x['source_name']}: [{x['title']}]({x['link']})")
        L.append("")
    L += ["## 3. 커뮤니티·트렌드 신호 (전부 🔴 미확인 — 1·2절과 대조 후 사용)", ""]
    for x in [i for i in items if i["tier"] == "D"][:40]:
        L.append(f"- {x['source_name']}: [{x['title']}]({x['link']})")
    L += ["", "## 4. 소스 상태", "", "| 소스 | 분야 | 등급 | 상태 | 수집 |", "|---|---|---|---|---|"]
    for src, n, st in status_rows:
        L.append(f"| {src['name']} | {src['cat']} | {src['tier']} | {st} | {n} |")
    L += ["", "> 규칙: 🔴/🟠 항목은 ✅ 항목과 대조되기 전엔 '사실'로 쓰지 않는다. 기사 본문 복사 금지, 요약+출처 링크만."]
    (outdir / "brief.md").write_text("\n".join(L), encoding="utf-8")
    (outdir.parent / "latest.md").write_text("\n".join(L), encoding="utf-8")


def main():
    cfg = yaml.safe_load((ROOT / "sources.yaml").read_text(encoding="utf-8"))
    sources = cfg["sources"]
    only = os.environ.get("ONLY")
    if only:
        sources = [s for s in sources if s["id"] in only.split(",")]
    items, status_rows = [], []
    with cf.ThreadPoolExecutor(max_workers=16) as ex:
        for src, out, st in ex.map(collect_source, sources):
            items.extend(out); status_rows.append((src, len(out), st))
            print(f"{st:40s} {len(out):3d}  {src['id']}", file=sys.stderr)
    items = dedupe(items)
    clusters = cluster(items)
    kst = NOW.astimezone(dt.timezone(dt.timedelta(hours=9)))
    outdir = ROOT / "out" / kst.strftime("%Y-%m-%d")
    write_report(clusters, items, status_rows, outdir)
    print(f"items={len(items)} clusters={len(clusters)} -> {outdir}")


if __name__ == "__main__":
    main()
