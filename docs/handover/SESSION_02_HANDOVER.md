# DailyDrop — 세션 인수인계 (-01 → -02)

## 규칙
- 작업 브랜치: `paycheck-page` 만. `main`에 push 금지. PR은 요청 시에만.
- 사장님께는 한국어, 국가는 "한글 풀네임(약어)"로 표기 (사이트 표기는 그대로).
- API 키는 쓰지 않음 (비용 사유). Claude 세션 운영. run.py는 키 없으면 조용히 skip.
- 큰 도구 출력(list_triggers, actions_list 등)은 컨텍스트를 키우므로 피한다.

## 공개 20개국 / 비공개 23개국
- 공개: KR US JP GB DE FR IN AU CA TW BR IT ES NL CH ID VN UA SA IL
- 비공개(`site/countries.json` `hidden:true`): ZA AT BE IE NZ PT MY PK PE CO PL KE HK EG CL AR AE SG PH MX TH TR NG
- 비공개국은 빌드·schedule.js·IndexNow·run.py 대상에서 제외, editions.json 기록은 보존.

## 파이프라인 (JSON 방식, 판당 약 12만 토큰)
`ops/autoed/`: prep.py(압축 SQL) → SPEC.md → check_spec.py → render.py(직전판을 템플릿으로 HTML 생성) → finish.py(검증·등록·빌드·커밋·push).
finish.py 실행 시 `DD_META_DIR` 환경변수를 현재 세션 경로로 지정(기본값은 옛 scratchpad).

## 번역
- 번역 데스크 세션: session_01VqETePG6o1uBNtmku4NWm5 (모델 Sonnet 5.5). push 후 `JOB: site/editions/<prefix>/DATE.html -> ko, en, ja`(원문 언어 제외) 전송.
- 범위: 현재 ko·en·ja. es fr zh-TW it de pt 추가는 사장님 확인 시에만.
- 사이트 내 번역: `/api/mt` (Workers AI m2m100 + D1 mt_cache). 배포 후 실서버 검증 필요(US 페이지에서 KOR).

## 남은 일
- 10/16판 미작성: US, CA, BR (발행시각 BR ~09:00Z, US 10:00Z, CA 10:00Z).
- 번역 범위 결정 대기, 6c12c0d 배포·Workers AI 동작 확인.
- 24시간 후 주간 한도 사용률로 실제 소모 페이스 확인.

## Cloudflare
- site Worker: `site/`, feed D1 `dailydrop-feed` 0f239386-f7cf-42ed-838d-46eb896bea87, users D1 `dailydrop-users` f3291f00-21f6-4f8a-b1bc-0e25b6ab1767
- 현황 대시보드 아티팩트: https://claude.ai/artifact/9pbanJUeWnpqNQeGu6ZymL

## 토큰 절감 방안
### 적용 완료
1. 공개 43→20개국 (판 수 약 53% 감소; 일정·IndexNow·자동작성 제외)
2. JSON 파이프라인(prep/spec/render) 도입 — 오늘 아침 대비 약 81% 절감 예상
3. 번역 언어 축소(ko·en·ja 우선), 번역 데스크 Sonnet 5.5
4. 사이트 내 번역을 Workers AI로 이전 (토큰 0)
5. API 키 미사용(비용), Claude 세션 운영 유지
6. 새 세션(-02)로 이전 — 컨텍스트 축소
7. 매시 점검 24→8회/일, 이상 없으면 무보고
### 하면 좋은 것
- 지역 트리거를 묶어 중복 컨텍스트 로딩 줄이기
- 번역은 기사 단위 변경분만, es/fr/zh-TW/it/de/pt는 접속 데이터 보고 결정
- 접속 낮은 공개국은 격일/요약판 검토
- 본문 분량(리드 단어수) 소폭 축소
- 대용량 도구 출력 금지, 필요한 필드만 조회
- 주간 한도 % 매일 확인해 페이스 조절

## 팝업 분량 (2026-10-17 사장님 지적)
- 10/16(12호) 미국·캐나다·브라질과 10/17(13호) 전 나라 팝업이 한 줄짜리로 얇게 나온 적이 있다(팝업 하나 what+why+me+say 평균 150~360자, 예전 판은 600~1,300자). 지시문의 "1~2문장"을 한 문장 이하로 해석한 에이전트 편차가 원인이고 check_spec 이 길이를 보지 않았다.
- 이제 check_spec.py 가 팝업당 합계 하한(라틴 520자 / 한중일 320자)을 막는다. SPEC.md 에도 "what 4~5문장, why·me·say 각 2문장, 구호·상투문 금지"를 명시했다. 에이전트 지시문에 "aim for SPEC length targets" 만 쓰지 말고 popup 분량(라틴 약 800자, 한중일 약 450자)을 같이 적을 것.
- 팝업을 고쳐 다시 올릴 때: spec 의 popups 만 고치고 finish.py 를 다시 돌리면 되지만, 번역본(.ko/.en/.ja)의 팝업이 옛 길이로 남으므로 번역 데스크에 JOB 을 다시 보내야 한다.

## 시세 종가 기준 (2026-10-17 사장님 결정)
피드(D1 quotes)에서 state=CLOSED 이고 ts 가 장 마감 이후인 종가는 단일 출처여도 ears·markets 에 쓴다(기사 2곳 확인 규칙은 기사에만 적용). 해당 지표 행이 피드에 없을 때만 "—".

## 보고 규칙 (2026-10-17 사장님)
사장님이 "관리자 화면"·트래픽·회원 현황을 달라고 하면 사이트 관리자 화면(/api/admin/stats)과 같은 건수 통계를 **아티팩트로** 보고한다(이메일 등 개인 식별 정보는 넣지 않는다). 기존 아티팩트 "데일리드롭 트래픽 현황"(https://claude.ai/artifact/61rJtVhbTyc8naCPK1oG8U)을 갱신해서 쓴다.

## 팝업 닫기 버튼 금지 (사장님 반복 지시)
- 모든 팝업(기사·속보·속보 목록)에 닫기 버튼을 넣지 않는다. 바깥 탭·Esc로 닫는다.

## 발행 전 일관성 검토 (사장님 승인 10/23)
- check_spec.py 통과 후, finish.py 전에 검토 에이전트(작성 에이전트와 다른 에이전트)를 한 번 돌린다.
- 검토 지시: 판 전체를 읽고 같은 사실(날짜·숫자·직함·호칭·매체 수·건수·용어집 정의)이 헤드라인·deck·본문·귀·팝업·용어집·색인에서 모두 같은지 확인, 다르면 출처가 가장 많은 쪽으로 최소 수정, 출처 없는 언급(본문에 없는 수치를 말하는 kick 등)은 삭제, 팝업의 소개 없는 인물은 출처로 신원 보강. 수정 후 check_spec.py 재통과.
- 계기: 10/23 KR·JP·TW 원문에서 번역 데스크가 같은 사실 불일치(지수 %, 직함, 선박 척수, 태풍 강도 정의, 매체 수)를 다수 발견.

## 토큰 기록 (사장님 요청 10/23)
- 작성·검토 에이전트가 끝날 때마다 완료 알림의 subagent_tokens 를 세션 스크래치패드 tokens.tsv 에 한 줄(date, job, tokens)씩 추가한다. 08:00 현황 보고가 이 파일로 일별 합계·추이를 보고한다.

## 모델 규칙 (사장님 10/23, 이전 "KR·JP·US는 Opus" 규칙 대체)
- 모든 에이전트(작성·검토·수정·시험 원고)는 Agent 호출에 model: "sonnet", effort: "medium" 을 준다. Opus 는 쓰지 않는다.
- API 대체 작성기(ops/autoed/run.py)는 이미 claude-sonnet-5-5 / medium 이 기본값.

## 운영 방식 변경 — 토큰 절감 3가지 (사장님 승인 10/23, 품질 불변)
1. 작성 에이전트 입력 줄이기: 에이전트에게 task md 와 SPEC.md 경로만 넘기고 지시문을 반복해 풀어쓰지 않는다(공통 규칙은 SPEC.md 에 있음). D1 조회는 필요한 열·행만(LIMIT, 요약 잘라서). 이미 task md 에 든 자료를 다시 조회하지 않는다.
2. 검토는 3개국(KR·US·JP)을 한 에이전트가 한 번에 읽고 고친다(판별 검토 금지). 단, 판 사이 사건 중복 확인도 같은 호출에서 한다.
3. 번역 재사용: 원문을 고쳐 재번역할 때는 바뀐 문단만 다시 번역하도록 번역 데스크에 변경 문단 목록(diff)을 JOB에 붙인다. 전체 재번역은 구조가 바뀐 때만.
- 팝업 분량·발행 횟수·Haiku 사용은 품질 때문에 건드리지 않는다.

## 석간 운영 (evening edition, 사장님 요구)
- 개념: 각국은 같은 날짜에 현지 18:00 석간(`slot:"pm"`)을 완전한 두 번째 판으로 낼 수 있다. 조간과 호수(no)가 같다(제19호 조간 → 제19호 석간). 석간이 공개되면 1면·최신호가 석간이 되고 조간은 보관함의 지난 호가 된다. 표기: KR `… 석간`, JP `… 夕刊`, US `… · Evening`.
- 주소·파일: 조간 `/<prefix><date>/` · `site/editions/<prefix><date>.html` (변경 없음). 석간 `/<prefix><date>-pm/` · `site/editions/<prefix><date>.pm.html`, 번역 `/<prefix><date>-pm/<lang>/` · `<prefix><date>.pm.<lang>.html`(자동 감지, editions.json translations 로 지정도 가능). markets.json·pool.json·extras 키는 `<date>-pm`(US 등은 `US:<date>-pm`, extras `site/extras/<prefix><date>-pm.json`).
- editions.json: 석간 항목 = `{date, no(=조간과 같음), file:"editions/<prefix><date>.pm.html", blurb, region, slot:"pm", publish_at:"<현지 18:00의 UTC>"}`. 호의 식별 = (region, date, slot); 빌드는 중복·호수 불일치를 오류로 막는다.
- 만드는 법(조간과 같은 JSON 방식):
  1. `python3 ops/autoed/mktask.py CODE DATE --slot pm --dir <작업폴더>` → `CODE_DATE_pm_task.md` (자료 창은 현지 17:00까지, spec 은 `CODE_DATE_pm_spec.json`, spec 에 `"slot":"pm"`; 같은 폴더의 `CODE_DATE_spec.json`(조간)과 사건이 겹치면 check_spec.py 가 막는다).
  2. 작성 에이전트 → `python3 ops/autoed/check_spec.py CODE_DATE_pm_spec.json` ok → (검토 에이전트) → render.py 가 같은 날 조간 HTML(없으면 직전 판)을 템플릿으로 `<prefix><date>.pm.html` 생성.
  3. `DD_META_DIR=<작업폴더> python3 ops/autoed/finish.py CODE:DATE:pm` → 검증·등록(publish_at = 현지 18:00, 이미 지났으면 즉시)·빌드·push. 여러 개: `finish.py KR:2026-10-23:pm US:2026-10-23:pm`.
  4. 예약: publish_at 이 미래면 schedule.js 가 `_sched/<나라>-<date>-pm` 사본을 만들어 Worker 가 현지 18:00에 내보낸다(조간 예약과 같음).
- 번역 JOB(push 후, 원문 언어 제외): `JOB: site/editions/<prefix><date>.pm.html -> ko, en, ja` → 결과 파일은 `site/editions/<prefix><date>.pm.<lang>.html`.
- 주의: 석간은 TTS 읽어주기·앵커 원고 대상이 아니다(한국판 조간 전용). run.py 폴백 자동 작성은 조간만 만든다(석간은 세션이 올린다). 앱 API(`/app/v1`)에는 석간이 `<date>-pm.<lang>.json` + index 항목 `slot:"pm", id:"<date>-pm"` 으로 추가된다(앱 쪽 표시는 별도 확인 필요). 푸시 알림은 `edition:"<date>-pm"` 으로 조간과 따로 한 번 나간다(feed Worker 배포 필요).

## 용어사전은 어려운 용어만 (사장님 10/25)
- 판마다 glossary 15~40개, 일반 독자가 설명 없이는 모르는 개념·약어·제도만. 기업명·매체명·인명·지명·스포츠 팀·누구나 아는 기관은 넣지 않는다(분야 f 도 기업·미디어·인물·지리·스포츠 불가). check_spec.py 가 개수(15~40)와 분야를 검사한다.
- 화면: 그 판의 용어는 모든 등장 위치에 얇은 실선 밑줄, 지난 판에서 오른 용어는 연한 점선(site/build.js LINKALL, /gx/<언어>.json). 지난 판 용어는 짧은 단어·한 줄 뜻풀이·쉬운 분야를 뺀다. 기업·매체·지명·인물·스포츠 분야는 그 판 용어여도 밑줄을 걸지 않는다(기존 판 포함). 용어사전 페이지 목록은 그대로.
