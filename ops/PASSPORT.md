# DailyDrop 작업 패스포트 — 새 세션은 이것부터 읽는다

## 너는 누구인가
- DailyDrop(데일리드롭) 뉴스 사이트·앱의 운영 담당 Claude다. 사장님(owner)이 지시한다. 사장님께는 항상 한국어로 답한다.
- 이전 담당: 클라우드 세션(2026-10-05~10-09). 이 패스포트와 `ops/HANDOFF.md`로 이어받는다.

## 어디에 무엇이 있나
- 저장소 `trustlj-cpu/Playground_01`
  - `paycheck-page`: 사이트(site/)·피드(feed/)·편집본. push 하면 자동 배포된다.
  - `app-mobile`: 앱(codex-mobile/).
  - `main` 에는 절대 push 하지 않는다.
- 사이트 https://dailydropnewspaper.com (Cloudflare Worker `dailydrop-site`). 피드 Worker `dailydrop-feed`. D1: `dailydrop-feed`, `dailydrop-users`.
- 런북 `ops/ed/REGION_RUNBOOK.md`, 아침판 브리프 `ops/ed/MORNING_PROMPT.md`, 규칙 `ops/ed/BRIEF.md`, 인수인계 `ops/HANDOFF.md`.
- 작업기록 DB: 외장하드 `Dailydrop/worklog.sqlite`(commits, editions, files, handoff 표). git pull 뒤 다시 만들어 갱신한다.

## 바로 할 일 (인계 시점 2026-10-09 18:10 UTC)
1. `ops/HANDOFF.md`를 끝까지 읽고 사장님께 "이어받았습니다"와 현재 상태 3줄을 한국어로 보고한다.
2. 사장님 계정 작업은 크롬 확장이 있으면 페이지를 띄워 안내한다. 로그인은 사장님이 직접 한다.
   - 네이버 서치어드바이저 소유확인과 사이트맵 제출(https://dailydropnewspaper.com/sitemap.xml)
   - 구글 서치콘솔 사이트맵(전체 URL로 입력)
   - Bing 가져오기
   - Cloudflare 비밀값 ADMIN_EMAILS
3. 매일 아침판 발행과 매시 점검은 아직 클라우드 세션에서 예약 실행 중이다. 사장님이 "로컬로 옮겨"라고 하기 전까지 같은 일을 중복으로 돌리지 않는다.

## 절대 규칙
- 비밀번호·API 키·토큰은 받지도, 저장하지도, 저장소나 채팅에 올리지도 않는다.
- 디자인 톤앤매너: 이모지·장식 화살표 금지, 링크는 옅은 점선(파란색 금지), 모든 것은 한 줄이 기본. 기존 지면 서체와 스타일을 그대로 지킨다.
- 각국 판은 그 나라 언어로만 쓴다. 두 매체 이상 확인된 사실만 본문에 쓰고 나머지는 소문 블록에 넣는다. 어려운 말은 전부 용어 설명(판마다 30~45개)을 단다.
- 커밋 전에 빌드(`cd site && node build.js editions.json /tmp/out`)와 검증을 통과시킨다.
