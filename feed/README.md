# feed — 10분 자동 수집 → 웹 게시 → 1시간 취합

```
GitHub Actions (*/10)  →  feed/collect_fast.py  →  POST /ingest  →  Cloudflare Worker (dailydrop-feed) + D1
                                                                        ├ GET /                  시간순 목록 페이지(디자인 없음)
                                                                        ├ GET /items.json        원본 항목
                                                                        ├ GET /hourly/latest.json  직전 1시간 취합본 ← 콘텐츠 제작 에이전트 입력
                                                                        └ cron 매시 02분          hourly 테이블에 취합본 저장
```

## 켜는 법 (사장님, 1회)
1. Cloudflare 대시보드 → 프로필 → **API 토큰** → "Cloudflare Workers 편집" 템플릿으로 생성 (D1 편집 권한 포함되어 있음).
2. GitHub 저장소 → Settings → Secrets and variables → Actions:
   - `CLOUDFLARE_API_TOKEN` = 1의 토큰
   - `CLOUDFLARE_ACCOUNT_ID` = 대시보드 Workers & Pages 화면 오른쪽 "Account ID"
3. Actions 탭 → `feed-worker-deploy` → Run workflow. 끝나면 `https://dailydrop-feed.<계정서브도메인>.workers.dev` 가 열립니다.
   이후 10분마다 `feed-collect-10min` 이 자동으로 채웁니다.

비밀키(INGEST_KEY)는 배포 워크플로가 토큰에서 파생해 Worker 비밀로 넣고, 수집 워크플로가 같은 식으로 파생합니다. 따로 등록할 것 없음.

## 소스 추가 (Codex)
`issuedrop/sources.yaml` 또는 `feed/sources_extra.yaml` 에 같은 형식으로 추가:
```yaml
sources:
  - {id: yt_xxx, name: "유튜브 ○○ 채널", cat: 경제, region: KR, tier: C, type: rss, url: "https://www.youtube.com/feeds/videos.xml?channel_id=UC..."}
```
tier: A 공식·1차자료 / B 주요 매체 / C 분석·블로그·유튜브 / D 커뮤니티·SNS(팩트체크 필수).

## 취합본 형식 (`/hourly/latest.json`)
`{hour, hour_kst, n_items, by_field, sources[{source,n}], clusters[{topic, keywords, field, n_items, n_sources, tier_best, status, items[]}]}`
status: `확인(독립 소스 2+)` → 1면 후보 / `단일 소스` → 원자료 확인 후 / `분석/블로그` / `미확인(커뮤니티·트렌드)`.

## 한도 (무료 플랜)
D1 쓰기 10만 행/일 (예상 1~2만), Worker 요청 10만/일, Actions 월 2,000분 (10분 크론 ≈ 144회 × ~1.5분 = 월 6,500분 → **공개 저장소면 무제한, 비공개면 초과**). 비공개 유지 시 크론을 `*/20` 으로 낮추거나 저장소를 공개로.
