# issuedrop — 데일리드롭 이슈 수집기

국내외 전 분야 공개 소스(RSS · 구글뉴스 검색 RSS · 공개 JSON API)를 하루 3번 자동 수집해
중복을 제거하고, 같은 이슈를 다루는 **독립 소스 수**를 세어 신뢰 등급을 붙인 브리핑 초안을 만든다.

- `sources.yaml` — 소스 맵 (90+). 한 줄 추가하면 다음 실행부터 수집.
- `collect.py` — 수집·정규화·중복 제거·이슈 묶기·리포트. 표준 라이브러리 + PyYAML만 사용.
- `.github/workflows/issuedrop.yml` — KST 06/12/18시 자동 실행, 결과를 `issuedrop/out/<날짜>/`와 `issuedrop/latest.md`에 커밋.

## 신뢰 등급 규칙
| 표시 | 뜻 | 사용 규칙 |
|---|---|---|
| ✅ 확인 | A/B 등급 독립 소스 2개 이상이 같은 이슈 | 사실로 인용 가능 (출처 링크 필수) |
| 🟡 단일 소스 | A/B 소스 1개 | "~에 따르면"으로만 |
| 🟠 분석/블로그 | C 등급만 | 1차 자료 대조 후 |
| 🔴 미확인 | 커뮤니티·트렌드(D)만 | 사실로 쓰지 않음. 1·2절과 대조되면 그때 승격 |

소스 등급: **A** 공식·통신사·1차 자료(연준, 한은, 정책브리핑, 연합, SEC, DART, 팩트체크 기관) · **B** 주요 언론·전문매체 · **C** 분석·블로그·뉴스레터·HN · **D** 커뮤니티·SNS·급상승 검색어.

## 실행
```bash
pip install pyyaml
python issuedrop/collect.py                 # 전체
ONLY=yna_top,bbc_world python issuedrop/collect.py   # 일부만
WINDOW_HOURS=12 python issuedrop/collect.py          # 최근 12시간만
```
선택 키(GitHub → Settings → Secrets): `DART_API_KEY` (opendart.fss.or.kr 무료 발급) — 없으면 DART만 건너뜀.

## 소스 추가 방법
```yaml
- {id: 고유id, name: "표시 이름", cat: 분야, region: KR, tier: B, type: rss, url: "https://..."}
- {id: ..., type: gnews, q: "검색어"}            # 구글뉴스 검색 RSS (hl: en 가능)
- {id: ..., type: json, url: "...", parser: polymarket|kalshi|coingecko}
```
- X(트위터)는 RSS가 없고 Nitter 계열이 종료됨 → 같은 인물의 **Bluesky**(`https://bsky.app/profile/<핸들>/rss`) 또는 **YouTube 채널 RSS**(`https://www.youtube.com/feeds/videos.xml?channel_id=<ID>`)로 대체.
- Reddit RSS는 2026-11-13 종료 예정.
- 로그인·앱 전용(블라인드, SAVE, FinancialJuice 스쿼크, 블룸버그 단말)은 `manual_sources`에 메모만 두고 수동 확인.

## 출력
`latest.md` 구성: ① 여러 소스가 동시에 다루는 이슈(독립 소스 수 순) ② 분야별 단일 소스 헤드라인 ③ 커뮤니티·트렌드 신호(전부 🔴) ④ 소스 상태표(실패 소스 확인용).
이 초안을 보고 사람이 그날 5~7개 이슈를 골라 「무슨 일 / 왜 중요 / 내 생활에 미치는 영향 / 상반된 해석 / 데일리드롭의 판단」으로 쓴다. 기사 본문 복사 금지, 요약 + 출처 링크만.

## 한계 (정직하게)
- 제목 토큰 기반 묶기라 가끔 다른 이슈가 합쳐지거나 같은 이슈가 갈린다. 사람이 최종 선별.
- 소스 URL 중 일부는 매체 개편으로 깨질 수 있다 → ④ 상태표에서 `error`로 보이면 `sources.yaml` 수정.
- 수집기는 "읽을 거리"를 모을 뿐 사실 판정을 하지 않는다. ✅도 "두 매체가 같은 말을 한다"는 뜻이지 진실 보증이 아니다.
