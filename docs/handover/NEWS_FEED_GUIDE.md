# DailyDrop 뉴스피드 읽는 법 (다른 세션용)

판을 쓰는 모든 재료는 Cloudflare D1 `dailydrop-feed` 에서 나온다. 직접 RSS 를 긁거나 웹검색으로 새 사실을 만들지 않는다.

- 접근: Cloudflare MCP `d1_database_query`, `database_id = 0f239386-f7cf-42ed-838d-46eb896bea87` (ToolSearch 로 `select:mcp__Cloudflare_Developer_Platform__d1_database_query` 먼저 불러온다). **읽기만** 한다. INSERT/UPDATE/DELETE 금지, API 키 쓰지 않는다.
- 결과가 크면 `LIMIT`·`substr()` 로 줄인다. 전체 표를 통째로 내려받지 않는다(items 는 30만 행 이상).

## 테이블

| 테이블 | 무엇 | 주요 열 |
|---|---|---|
| `items` | 수집한 기사 한 건 = 한 행(약 30만 행, 10분마다 `batches` 로 추가) | `title`, `source`(매체), `region`(나라 코드, 세계 뉴스는 `GLB`), `lang`, `field`(분야), `tier`(A·B·C·D, A 가 가장 신뢰), `published_at`, `collected_at`, `summary`(짧은 요약), `link`, `batch` |
| `jev` | 시간대별(`hour`) 나라별 이슈 순위. `front`=1면감, `conf`=교차 확인도, `n`=묶인 매체 수 | `hour`, `region`, `title`, `n`, `front`, `conf` |
| `quotes` | 시세 한 줄 = 한 지표(`k` 키) | `k`, `v`(값), `chg`(등락률), `ts`(시각, **밀리초** 단위 epoch, UTC), `state`, `src` |
| `batches` | 수집 실행 기록(하루 약 144회). 130회 미만이면 이상 | `batch`, `started_at`, `n_fetched`, `n_new`, `errors` |
| `hourly`·`brk`·`term_hits` | 시간별 요약·속보·용어 노출 | 판 작성에는 직접 쓰지 않는다 |

## 읽는 순서 (판 하나를 쓸 때)

`ops/autoed/mktask.py CODE DATE --dir …` 가 아래 세 질의를 이미 만들어 준다. 임의로 다른 질의를 쓰지 말고 이것만 쓴다.

1. **나라 기사**: 판 창(현지 05:00 직전 30시간) 안의 `region = CODE` 기사. 제목 앞 48자로 묶어서 `count(DISTINCT source)` = **서로 다른 매체 수 `n`** 이 큰 순서로 본다. `n ≥ 2` 이면 "2곳 이상 확인", `n = 1` 이면 그 매체 이름을 밝히고 단일 출처로 쓴다.
2. **Jev 순위**: `jev` 에서 같은 창의 `front`·`conf` 상위 8개. 어떤 사건을 1면으로 올릴지의 힌트일 뿐, 사실의 근거는 1번의 기사다.
3. **시세**: `quotes` 에서 그 나라 키. `ts` 가 **장 마감 이후, 판 시각 이전** 인 값만 종가로 쓰고 나머지(장중·오래된 값)는 "—". 등락률 `chg` 는 직전 종가와 맞는지 한 번 계산해 본다(인도 10/17 판에서 +2.31% 가 직전 판과 안 맞은 적 있음).

세계 뉴스는 `region = 'GLB'` 이고 `tier IN ('A','B')` 만 쓴다(`prep.sql_world`). 판 작성자는 `--world 파일` 로 받은 항목을 그 나라 말로 옮기며 각도만 바꾼다. 이 파일이 없으면 세계 뉴스 항목은 비는데, 10/17 판 한국·독일 작업에서 그 파일이 없다고 보고됐다. 다음 작업 전에 확인할 것.

## 읽을 때 지켜야 할 것

- `title`·`summary` 는 **매체가 쓴 문장**이다. 베끼지 말고 사실만 뽑아 다시 쓴다(저작권·SPEC 규칙).
- `summary` 는 110자 안팎이라 본문이 아니다. 재료가 얇으면 없는 내용을 지어내지 말고 "확인되지 않았다"고 적는다(판이 얇아지는 원인이 이것이다 → 위 1번에서 `limit` 을 늘리거나 같은 사건의 다른 매체 행을 더 보는 것은 허용).
- 사건 날짜와 보도 날짜를 구분한다. 판 날짜 05:00(현지) 이후 일은 "오늘 볼 것" 에만 쓴다.
- 숨김 국가(공개 20개국 밖)의 `items` 는 판을 만들거나 점검하지 않는다.
- 사실 확인 기준: 서로 다른 매체 2곳 이상. 1곳이면 매체 이름 + `verify` 칸에 표시.
- 개인 정보·사용자 테이블(`dailydrop-users` DB)은 이 가이드의 범위 밖이다. 열람은 건수 통계만.

## 자주 쓰는 확인 질의 (그대로 복사해서 쓴다)

```sql
-- 어떤 나라에 최근 기사가 얼마나 들어오는지(최근 6시간)
SELECT region, COUNT(*) n, COUNT(DISTINCT source) srcs
FROM items WHERE datetime(published_at) >= datetime('now','-6 hours')
GROUP BY region ORDER BY n DESC LIMIT 25;

-- 수집이 돌고 있는지(하루 130회 미만이면 이상)
SELECT substr(started_at,1,10) d, COUNT(*) n FROM batches
WHERE started_at >= date('now','-3 days') GROUP BY d;

-- 한 나라의 상위 사건 20개(매체 수 순)
SELECT substr(title,1,100) t, count(DISTINCT source) n, min(tier) tier
FROM items WHERE region='KR' AND datetime(published_at) >= datetime('now','-30 hours')
  AND batch NOT LIKE '%bf-%'
GROUP BY lower(replace(replace(replace(substr(title,1,48),' ',''),'-',''),',',''))
ORDER BY n DESC, tier ASC LIMIT 20;

-- 시세 확인(키는 site/countries.json 의 tape 항목)
SELECT k, v, chg, datetime(ts/1000,'unixepoch') t_utc FROM quotes WHERE k IN ('sp500','kospi','nikkei');  -- ts 는 ms 이므로 /1000
```

관련 문서: `ops/autoed/README.md`(판 만드는 절차), `ops/autoed/SPEC.md`(스펙·분량·규칙), `docs/handover/SESSION_02_HANDOVER.md`(운영 인수인계).
