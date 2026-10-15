# 데일리드롭 자동 조간 (Claude 세션 없이)

피드 Worker 크론(매시 04분)이 GH_DISPATCH_TOKEN으로 `.github/workflows/autoed.yml` 을 호출하고, 그것이 `ops/autoed/run.py` 를 돌린다. (GitHub 자체 schedule은 main 브랜치 파일만 실행해서 쓰지 않는다.)

소급: Actions → autoed-morning → Run workflow, `dates` 에 `2026-10-13,2026-10-14` 처럼. 판마다 바로 push된다.

1. 나라마다 현지 시각이 05:30–11:59 이고 그 날짜 판이 `site/editions.json` 에 없으면 대상.
2. 자료(D1 또는 피드 Worker `/items.json`·`/quotes.json`·`/jev.json`)를 제목 중복을 합친 압축본으로 만들어, Anthropic API **1회 호출**로 본문 spec JSON만 받는다(`SPEC.md`). HTML 뼈대는 `render.py`가 그 나라 직전 판에서 가져온다.
3. 검증(`check_spec.py` 구조·용어·금지문구 → A/G 파싱, data-id↔A·title, `<article>` 닫힘, 크기, `build.js`) 통과분만 등록. 실패하면 오류를 알려 주고 1회 재시도. `publish_at` = 현지 06:00(이미 지났으면 즉시 공개).
4. commit·push 후 `site-deploy` 를 실행 → Worker가 06:00에 공개.

## 켜는 법 (사장님)
- 저장소 Settings → Secrets and variables → Actions → **New repository secret**: `ANTHROPIC_API_KEY`.
- 선택 Variables: `DD_MODEL`(기본 `claude-sonnet-5-5`), `DD_MAX`(한 회 최대 판 수, 기본 14), `DD_PAUSE=1`(일시 정지).
- 수동 실행: Actions → autoed-morning → Run workflow (`only` 에 `KR,JP` 처럼 나라 지정 가능).

## 아직 자동이 아닌 것
번역판(en/ko/ja), 원문 링크·인플루언서(extras), 한국판 앵커 원고, Jev 용어 판정, 앱 스냅샷. 판 자체는 이것들 없이도 발행된다.
비용 추정(실측 전): 판 1개 ≈ 입력 8천·출력(생각 포함) 1만 5천 토큰. `countries.json`의 `hidden:true` 나라(23개국)는 쓰지 않고, 사이트에도 나오지 않는다. 되돌리려면 그 줄의 `"hidden":true,`를 지우면 된다.
환경 변수: `DD_MODEL`, `DD_EFFORT`(생각 깊이), `DD_MAX`.
로그: `ops/autoed/log/<날짜>.jsonl`, 각 실행의 Actions 요약.
