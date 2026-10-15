# 데일리드롭 자동 조간 (Claude 세션 없이)

`.github/workflows/autoed.yml` 이 매시 07분에 `ops/autoed/run.py` 를 돌린다.

1. 나라마다 현지 시각이 03:00–11:59 이고 그 날짜 판이 `site/editions.json` 에 없으면 대상.
2. 피드 Worker 공개 자료(`/items.json` 30시간, `/quotes.json`, `/jev.json`)와 그 나라 직전 판(템플릿)으로 Anthropic API가 판을 쓴다.
3. 검증(A/G 파싱, data-id↔A·title, `<article>` 닫힘, 크기, `build.js`) 통과분만 등록. `publish_at` = 현지 06:00(이미 지났으면 즉시 공개).
4. commit·push 후 `site-deploy` 를 실행 → Worker가 06:00에 공개.

## 켜는 법 (사장님)
- 저장소 Settings → Secrets and variables → Actions → **New repository secret**: `ANTHROPIC_API_KEY`.
- 선택 Variables: `DD_MODEL`(기본 `claude-sonnet-5-5`), `DD_MAX`(한 회 최대 판 수, 기본 14), `DD_PAUSE=1`(일시 정지).
- 수동 실행: Actions → autoed-morning → Run workflow (`only` 에 `KR,JP` 처럼 나라 지정 가능).

## 아직 자동이 아닌 것
번역판(en/ko/ja), 원문 링크·인플루언서(extras), 한국판 앵커 원고, Jev 용어 판정, 앱 스냅샷. 판 자체는 이것들 없이도 발행된다.
비용 추정: 판 1개 ≈ 입력 5만·출력 2만 토큰, 하루 43개.
로그: `ops/autoed/log/<날짜>.jsonl`, 각 실행의 Actions 요약.
