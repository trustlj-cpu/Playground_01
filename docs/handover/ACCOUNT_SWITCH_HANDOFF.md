# DailyDrop 운영 임시 이관 — 원 계정 → 새 계정 (2026-11-01)

> **이 문서를 받은 새 계정 세션에게.** 이 이관은 **임시**다. 원 계정(세션 `-02`, session_015MZZnwLYXiyXeoEvP35biY)이 사용량 제한에 걸려 잠시 맡기는 것이다. 원 계정의 사용량이 풀리면 **운영을 다시 원 계정으로 돌려줘야 한다**(맨 아래 「되돌려주기」). 그때까지 아래 일을 똑같이 이어서 해라.

## 0. 처음 할 일 (순서대로)
1. 저장소 `trustlj-cpu/playground_01` 를 붙이고 **`paycheck-page` 브랜치**로 체크아웃한다. `main` 에는 절대 push 하지 않는다. PR 은 사장님이 시킬 때만 만든다.
2. 다음 문서를 끝까지 읽는다: 이 문서 → `docs/handover/SESSION_02_HANDOVER.md`(운영 규칙 전체) → `ops/autoed/SPEC.md`(기사 작성 규칙) → `ops/TRANSLATE_DESK.md`(번역 규칙).
3. 연결 확인: GitHub(이 저장소 push 권한), Cloudflare(D1 조회). 둘 중 하나라도 안 되면 사장님께 바로 말한다. **API 키는 쓰지 않는다.**
4. 아래 「2. 예약 작업」 6개를 **새 계정에 그대로 만든다**(이 세션을 대상으로). 원 계정의 예약 작업은 새 계정에서 보이지 않는다.
5. 「3. 번역」대로 번역 담당을 준비한다(원 계정의 번역 데스크 세션에는 새 계정에서 메시지를 보낼 수 없다).
6. 사장님께 한국어로 "이어받았습니다 + 다음 발행 시각"을 3~5줄로 보고한다.

## 1. 지금 상태 (2026-11-01 10:15 UTC 기준)
- 공개국은 **KR(한국, 사이트 루트·ko) · JP(일본, jp/·ja) · US(미국, us/·en)** 셋뿐이다. 나머지 나라는 10/23 사장님 결정으로 비공개라서 **절대 만들거나 고치지 않는다**.
- 발행 완료 (모두 ko·en·ja 번역 포함):
  - KR·JP 11/01 조간·석간 (제28호)
  - US 11/01 조간 (제28호). 번역은 데스크에 맡겼고, 데스크가 ko·ja push를 보고했다.
- **다음 차례:**

  | 판 | 시작 (뉴욕/서울 시각) | 시작 (UTC) | 발행 (UTC) |
  |---|---|---|---|
  | US 11/01 석간 | 16:50 EST | 21:50 | 23:00 (뉴욕 18:00) |
  | KR·JP 11/02 조간 | 04:55 KST | 11/01 19:55 | 21:00 (현지 06:00) |

- 미국은 **11/01 새벽 서머타임이 끝나 EST(UTC-5)** 다. 미국 예약 작업은 반드시 `CRON_TZ=America/New_York` 로 만든다(아래 표대로 하면 자동으로 맞는다).
- 사이트: https://dailydrop.kr. GitHub Actions가 매시 자동 배포한다. 예약 발행은 site Worker가 publish_at 에 내보낸다.

## 2. 예약 작업 (새 계정에 그대로 다시 만들 것)
모두 "이 세션으로 깨우기(persist)"로 만든다. **프롬프트 안의 번역 데스크 세션 ID는 새 계정의 번역 담당으로 바꿔라**(3번 참조).

| 이름 | cron | 하는 일 |
|---|---|---|
| 데일리드롭 아침판 KR·JP | `CRON_TZ=Asia/Seoul 55 4 * * *` | 현지 05시 시작, 06:00 발행 |
| 데일리드롭 석간판 KR·JP | `CRON_TZ=Asia/Seoul 50 16 * * *` | 현지 16:50 시작, 18:00 발행 + 일관성 검토 1회 |
| 데일리드롭 아침판 US | `CRON_TZ=America/New_York 51 4 * * *` | 뉴욕 04:51 시작, 06:00 발행 |
| 데일리드롭 석간판 US | `CRON_TZ=America/New_York 50 16 * * *` | 뉴욕 16:50 시작, 18:00 발행 + 일관성 검토 1회 |
| 데일리드롭 현황 보고 | `CRON_TZ=Asia/Seoul 52 7 * * *` | 08:00 KST 사장님께 현황 보고 |
| 데일리드롭 파이프라인 점검 | `8 */3 * * *` (UTC) | 하루 8회 점검, 이상 없으면 **무보고** |

각 작업의 프롬프트 원문은 「부록 A」에 있다(그대로 복사해서 쓰되 번역 세션 ID만 바꾼다).
(원 계정에는 "깃허브 활용 노트" 예약 작업도 있지만 데일리드롭과 무관하다. 옮기지 않는다.)

## 3. 번역 (원 계정 데스크를 쓸 수 없음)
- 원 계정 번역 데스크(session_01VqETePG6o1uBNtmku4NWm5)는 다른 계정이라 연락이 안 된다. 다음 중 하나로 한다.
  - **(권장)** 판을 push 한 직후 이 세션에서 번역 에이전트를 언어별로 하나씩 띄운다(model sonnet, effort medium). 지시문은 "`ops/TRANSLATE_DESK.md` 의 역할·브리프·검증 규칙대로 `<원문 경로>` 를 `<lang>` 으로 번역·검증·커밋·push" 한 줄만 준다.
  - 또는 새 계정에 번역 전용 세션을 하나 만들고 `ops/TRANSLATE_DESK.md` 를 첫 메시지로 준 뒤, `mcp__claude-code-remote__send_message` 로 `JOB: <경로> -> <언어들>` 을 보낸다.
- 언어: KR 원문 → en, ja / JP 원문 → ko, en / US 원문 → ko, ja.
- 번역 규칙 중 반복 지적된 것:
  - 원문에 없는 성별 대명사(he/she)를 넣지 않는다.
  - 원문에 없는 라틴 이름을 덧붙이지 않는다.
  - 출처(src) 줄 밖에 매체 이름을 넣지 않는다.
  - 석간 원문이 아침 문구("매일 아침 7분…")를 쓰고 있어도 **원문대로 번역**한다. 이 문구는 사장님 결정 대기 중이다.

## 4. 판 하나를 만드는 순서 (요약 — 자세한 건 SESSION_02_HANDOVER.md·SPEC.md)
1. 이미 있는지 먼저 확인한다(중복 방지). `git fetch origin paycheck-page` 후 `site/editions/<prefix><date>[.pm].html` 이 origin 에 이미 있으면 **만들지 말고 건너뛴다**. 원 계정이 사용량이 풀려 먼저 만들었을 수 있다.
2. `git pull --rebase origin paycheck-page` → `python3 ops/autoed/mktask.py CODE DATE [--slot pm] --dir <스크래치패드>/ed/MMDD`.
3. 작성 에이전트(model **sonnet**, effort **medium**)에게 task md 경로와 SPEC.md 경로만 준다. 에이전트는 spec JSON 을 쓰고 `python3 ops/autoed/check_spec.py <절대경로>` 통과까지 한다.
4. 석간은 검토 에이전트를 한 번 돌린다(두 나라 spec 을 같이 읽고 같은 사실 불일치·근거 없는 주장·재탕 기사를 고친다).
5. `DD_META_DIR=<그 폴더> python3 ops/autoed/finish.py KR:DATE JP:DATE` (석간은 `:pm`) → `git pull --rebase` → `git push origin paycheck-page`.
6. 번역(3번) → 에이전트 토큰을 스크래치패드 `tokens.tsv` 에 기록(date, job, tokens) → 사장님께 한국어로 짧게 결과(1면 헤드라인 + 확인 못 한 것).
- DATE: KR·JP 는 현지 날짜, US 는 뉴욕 날짜.
- 마켓이 쉬는 날(주말)은 직전 거래일 종가를 "10/30(금) 종가"처럼 밝혀서 쓴다.

## 5. 반드시 지킬 편집 규칙 (사장님이 여러 번 지적한 것)
- **다른 신문사·방송·통신사의 이름이나 기사·평가를 본문에 인용하지 않는다.** 이것은 사장님이 "다른신문사 글애 인용하지 말라니까"라고 직접 지적한 것이다.
  - 금지 표현: "○○에 따르면", "외신/영국 언론이 보도", "取材で分かった", "according to documents and interviews", "told [매체]".
  - 우리가 취재한 것처럼 쓰는 것도 금지다. 사실은 우리 목소리로 쓴다.
  - 인용은 말한 사람·기관만 밝힌다.
  - 매체 이름은 팝업 src·extras·verify 에만 둔다.
  - 기사 전체가 "다른 매체가 이렇게 보도했다"인 소식은 싣지 않는다. 다른 소식으로 바꾼다.
  - check_spec 은 매체 이름은 막지만 "외신/영국 언론/取材" 같은 일반 표현은 못 막는다. **발행 전에 직접 훑어본다.**
- **재탕 금지.** 앞 판(전날 석간·같은 날 조간)의 기사를 새 진전 없이 다시 싣지 않는다. 에이전트가 자주 어기니 발행 전에 앞 판 헤드라인과 비교한다.
- **근거.** 사실은 2개 이상 출처가 있어야 한다. 출처가 하나뿐이면 "1매체"로 표시하거나 뺀다. 확인 안 된 것은 "확인되지 않았다"고 쓴다.
- **문체.** 첫 판(No.1~5)의 문체로 쓴다. 무슨 일이 있었는지 먼저 쓰고, 숫자는 독자가 이해할 단위로 바꾸고, 어려운 말은 풀고, 아직 정해지지 않은 것을 밝힌다.
- **진행 중인 큰 사안 표기(바이낸스 해킹):**
  - 63억 달러는 바이낸스가 스스로 추정한 피해 자산 규모로 쓴다.
  - FBI는 60억 달러 이상 도난, 북한(TraderTraitor) 소행이라고 지목했다. 11/01 기준 피드 5건 이상으로 확인됐다.
  - 바이낸스는 담보 95%를 복구했다고 밝혔다(처음엔 90%).
- 사장님께는 항상 한국어로 말한다. 큰 도구 출력은 피한다.

## 6. 사장님 결정을 기다리는 것 (먼저 바꾸지 말 것)
- 석간 하우스 라인·마스트헤드 부제(지금 KR·JP·US 모두 아침 문구)
- 10/28 이전 판들의 매체 인용 소급 수정 여부
- 번역 데스크가 보고한 원문 내부 불일치(팝업과 본문의 작은 차이)를 고칠지
- 사용량 한도: 한도를 올릴지, 판을 줄일지
- 파이낸스 로고 선택, JP TOPIX "—" 표기, 성별 중립 소급, 앤트로픽/앤스로픽 표기

## 7. 데이터·대시보드
- D1: dailydrop-users `f3291f00-21f6-4f8a-b1bc-0e25b6ab1767`, dailydrop-feed `0f239386-f7cf-42ed-838d-46eb896bea87`(표 `items`: title, link, source, published_at, summary, region).
- 08:00 보고 쿼리(대시보드와 같음): `docs/handover/report_queries.sql`.
- 현황 대시보드 https://claude.ai/artifact/9pbanJUeWnpqNQeGu6ZymL 는 **원 계정 소유**라 새 계정에서 안 열릴 수 있다. 보고에는 쿼리 결과 숫자만 쓰고 링크는 "원 계정 대시보드"로 적는다.
- 토큰 장부: 원 계정 기록은 `docs/handover/tokens_ledger.tsv` 에 옮겨 두었다. 새 계정은 스크래치패드 `tokens.tsv` 에 이어서 적는다. 보고 때는 "새 계정 세션의 판 작성·검토 에이전트만"이라고 밝힌다.

## 8. 계속 돌아가는 것 (손대지 않아도 됨)
GitHub Actions는 계정과 무관하게 계속 돈다.
- `site-deploy` 매시 배포
- `feed` 수집(하루 약 140회, 130회 미만이면 이상)
- `issuedrop` 3시간마다 보고 커밋
- `autoed`: 세션이 판을 못 올리면 API로 조간을 대신 쓰는 백업 작성기

## 되돌려주기 (원 계정 사용량이 풀리면)
1. 사장님이 "원 계정으로 돌려줘"라고 하거나, 원 계정 세션이 다시 판을 올리기 시작한 것이 보이면 시작한다. 원 계정 커밋은 이 형식이다.
   ```
   Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
   Claude-Session: https://claude.ai/code/session_015MZZnwLYXiyXeoEvP35biY
   ```
2. 이 문서 맨 아래 「새 계정 운영 기록」에 다음을 적어 `paycheck-page` 에 커밋·push 한다.
   - 운영 기간
   - 발행한 판 목록
   - 토큰 일별 합계(그리고 `docs/handover/tokens_ledger.tsv` 에 새 계정 줄 추가)
   - 새로 생긴 사장님 지시·결정
   - 미해결 문제
   - 바꾼 파일
3. 새 계정의 데일리드롭 예약 작업 6개를 **모두 끈다**(enabled=false). 그래야 두 계정이 같은 판을 이중으로 만들지 않는다.
4. 사장님께 "원 계정으로 넘길 준비 완료, 원 계정 세션에서 이 문서의 「새 계정 운영 기록」을 읽고 이어받으면 된다"고 한국어로 알린다.
5. 원 계정 세션은 돌아오면 이 기록을 읽고 자기 예약 작업(아직 켜져 있음)을 그대로 이어서 쓴다.

---

## 부록 A — 예약 작업 프롬프트 원문 (번역 세션 ID `session_01VqETePG6o1uBNtmku4NWm5` 는 새 계정 번역 방식으로 바꿀 것)

**아침판 KR·JP** — Daily morning edition run for KR (site root, ko) and JP (jp/, ja). Branch paycheck-page only (never main). Follow docs/handover/ACCOUNT_SWITCH_HANDOFF.md, docs/handover/SESSION_02_HANDOVER.md and ops/autoed JSON pipeline. First skip any edition whose file already exists on origin/paycheck-page. For each CODE:DATE (DATE = today's local date) 1) python3 ops/autoed/mktask.py CODE DATE --dir <session scratchpad>/ed/MMDD; 2) edition agent (model sonnet, effort medium) reads the task md, writes the spec JSON per ops/autoed/SPEC.md and passes check_spec.py; check no outlet citations and no repeats; 3) DD_META_DIR=<that dir> python3 ops/autoed/finish.py CODE:DATE, then git pull --rebase origin paycheck-page and push to paycheck-page immediately; 4) translate (KR -> en, ja; JP -> ko, en) per ops/TRANSLATE_DESK.md; 5) log agent tokens to scratchpad tokens.tsv; 6) post ONE short Korean result to the owner (headline + link + what was unconfirmed). No API key use, no large tool outputs, hidden countries never.

**석간판 KR·JP** — Daily EVENING edition (석간) run for KR and JP. Same as above but `--slot pm`, `finish.py KR:DATE:pm JP:DATE:pm`; the evening edition has the SAME issue number as the morning edition and is published 18:00 local; it covers news since the morning edition, no repeats of morning stories except genuine follow-ups; after both specs pass, ONE consistency-review agent (sonnet, medium) reads both countries' specs, fixes same-fact mismatches, unsupported claims, outlet citations and repeats, re-passes check_spec.

**아침판 US** — Daily morning edition run for US (us/, American English). DATE = today's New York date. Same flow as KR·JP morning; finish.py US:DATE (publish_at = 06:00 New York); translate -> ko, ja.

**석간판 US** — Daily EVENING edition run for US. DATE = New York date. Same flow as KR·JP evening (with one review agent); finish.py US:DATE:pm (18:00 ET); translate -> ko, ja.

**현황 보고 (08:00 KST)** — Run the queries in docs/handover/report_queries.sql (no personal fields). Read scratchpad tokens.tsv (plus docs/handover/tokens_ledger.tsv for days before the switch): yesterday's total, last 7 days per day, change vs the day before; say it covers only this session's edition/review agents. Post ONE short Korean message: yesterday's real visitors and page views with change vs the day before, 7-day total, top sources, top editions, accounts/bookmarks, collection runs per day (flag a day under ~130), token trend; say "확인 안 하고 가정한 것" if anything was assumed; if a query fails say which and why. Keep tool outputs small.

**파이프라인 점검 (하루 8회)** — Silent when healthy: do NOT message the owner if all is fine. Cheap checks only: 1) git fetch origin paycheck-page; for each of KR US JP whose local 05:00 has passed today, confirm today's local-date edition exists (and the 18:00 evening edition once its local 18:30 has passed); 2) latest site-deploy run on paycheck-page not failed; 3) every published edition has its translation files. Only if something is missing or broken: fix it if small (re-run the pipeline for that country) and send ONE short Korean message to the owner naming the country/cause.

---

## 새 계정 운영 기록 (새 계정 세션이 운영 중 계속 적고, 되돌려줄 때 마무리)
- 운영 시작:
- 발행한 판:
- 토큰 일별 합계:
- 새 사장님 지시·결정:
- 미해결:
- 바꾼 파일:
