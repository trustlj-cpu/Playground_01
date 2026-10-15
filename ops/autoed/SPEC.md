# 판 작성 스펙 (JSON) — 에이전트용

너는 **본문 JSON만** 쓴다. HTML·CSS·스크립트·고정 문구(라벨, 푸터, 팝업 UI)는 `render.py` 가 그 나라 직전 판에서 가져온다. HTML 을 쓰지 마라. 템플릿 HTML 을 읽지 마라.

## 출력
`{OUT}_spec.json` 한 파일(UTF-8). 쓴 뒤 `python3 /home/user/Playground_01/ops/autoed/check_spec.py <파일>` 이 `ok` 를 출력할 때까지 고쳐라.

## 형식
```
{
 "region":"IE", "date":"2026-10-16",
 "ears":[{"v":"—","cap":"왼쪽 지표 이름 · 기준일 · 설명"},{"v":"—","cap":"오른쪽 …"}],   // 값은 2곳 이상 확인된 '완료된 종가'만. 아니면 "—"
 "dateline":{"left":"No. 12 · Morning (그 나라 말로)","date":"Friday, 16 October 2026 (그 나라 말로)"},
 "stories":[ 정확히 5개: [0]=리드, [1]=옆기사, [2]=가로단 왼쪽, [3]=가로단 오른쪽, [4]=아래 넓은 기사 ],
 "index":[ 정확히 5개 {"id","hl","em","tag"(예: "World · ✓ 4 outlets"),"kick"(선택)} ],
 "rumor":[ 정확히 3개 {"claim","resp"} ],    // 실제로 돌고 있는 주장과 확인 결과(출처 명시)
 "next":[ {"label":"오늘 · 금 10월 16일","text":"…"}, {"label":"이번 주","text":"…"}, {"label":"나중에","text":"…"}, {"label":"독자에게","text":"…"} ],
 "popups":{ "<id>":{"what","why","me","a","b","say","src"} },    // stories 5개 + index 5개 = 10개 전부
 "glossary":{ "용어":{"f":"분야","d":"풀이","w":"이번 호에서의 맥락"} },   // 18~25개, 모든 키는 본문 글자에 그대로 있어야 함
 "blurb":"핵심 3건을 ' · ' 로 이은 한 줄(그 나라 말)",
 "markets":{},                // 완료된 종가만 {"키":{"v":숫자,"chg":숫자,"asof":"10/15"}}; 확실치 않으면 비워둠
 "pool":[ 10~14개 한 줄 단신, 각각 "… (출처)" 로 끝남 ]
}
```
story = `{"id","cat":"분야 · 세부","verify":"✓ N매체 · 무엇이 미확인","hl":"제목(<br> 금지)","deck":"리드만","paras":[…],"nums":[{"b","s"}×3 선택],"word":{"term","field","def"} 선택,"briefs":[{"t","s"}×6~8 은 [4]번 기사에만]}`.
분량: 리드 3~4문단 약 350~420단어(한·중·일은 700~900자), 나머지 기사 1~2문단 150~220단어. 팝업의 what 은 3~5문장, why·me·say 는 1~2문장, a·b 는 보통 "".

## 규칙 (사장님 방침)
- 사실은 **서로 다른 매체 2곳 이상**에서 확인된 것만. 한 곳뿐이면 매체 이름을 밝히고 `verify` 에 적는다. 숫자는 출처를 붙인다. 기사 문장을 베끼지 마라.
- 사건 날짜와 보도 날짜를 구분. 판 날짜 05:00(현지) 이후 일은 "오늘 볼 것"에만.
- 지표(ears/markets)는 시세 표의 ts 가 마감 이후·판 시각 이전인 것만. 장중 값 금지. 불확실하면 "—".
- **DailyDrop 이 어떻게 만들어지는지, 어떤 도구·AI 가 쓰는지는 어디에도 쓰지 마라.**
- 어려운 용어(약어·기관·제도·인명)는 glossary 에. 그 나라 독자가 모를 만한 것만.
- 세계 뉴스는 `world_*.json` 의 해당 항목을 그 나라 말로 옮기고 그 나라 독자에게 맞게 각도만 바꿔라(새로 조사하지 마라). 나라 뉴스에 집중.

## 자료 (조회는 이 두 번만)
1. Jev: `SELECT title,n,front,conf FROM jev WHERE region='{CODE}' AND hour >= '{SINCEH}' AND hour <= '{UNTILH}' ORDER BY front DESC, conf DESC LIMIT 8`
2. 나라 기사: 작업 파일에 적힌 SQL 한 번(제목 중복이 이미 합쳐져 있음).
Cloudflare MCP: ToolSearch "select:mcp__Cloudflare_Developer_Platform__d1_database_query", database_id 0f239386-f7cf-42ed-838d-46eb896bea87.
