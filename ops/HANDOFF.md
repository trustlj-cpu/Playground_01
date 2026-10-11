# DailyDrop 인수인계 (2026-10-09 18:00 UTC 기준, 클라우드 세션 → 로컬 세션)

## 저장소·브랜치
- GitHub `trustlj-cpu/Playground_01`
- `paycheck-page` = 사이트·피드·편집 작업 브랜치. push 하면 자동 배포: site-deploy.yml(사이트 Worker), feed-deploy.yml(피드 Worker). **main 에는 push 하지 않는다.**
- `app-mobile` = 앱(Capacitor, `codex-mobile/`). `npm run build` + `npm test` 후 push.
- 운영 문서·스크립트: 이 폴더 `ops/` (ed/ = 편집 런북·브리프, scripts/ = 등록·동기화, clustertest/ = 묶음 회귀 테스트).
  스크립트 안의 `/tmp/claude-0/...scratchpad` 경로는 클라우드 경로다. 로컬에서는 이 저장소 경로로 바꿔 쓴다.

## 서비스 현황
- 대표 주소 **https://dailydropnewspaper.com**. dailydrop.kr·www·workers.dev 는 301 로 넘어간다(site/src/index.js CANON).
- Cloudflare: Worker `dailydrop-site`(정적+회원 API, D1 `dailydrop-users`), Worker `dailydrop-feed`(수집·속보·시세·Jev, D1 `dailydrop-feed` 0f239386-f7cf-42ed-838d-46eb896bea87).
- 회원: 이메일·비번 가입, 인증코드 메일 = Cloudflare Email Sending(EMAIL 바인딩, MAIL_LIVE="1"). Google 로그인은 GOOGLE_CLIENT_ID 비밀값이 들어가면 켜진다(아직 없음).
- 관리자 화면 /admin/: ADMIN_EMAILS 비밀값 + 이메일 인증 계정. 회원 목록 포함.
- 검색: hreflang·NewsArticle JSON-LD·sitemap(번역 포함)·IndexNow(배포 때 자동)·네이버 인증 메타. 기사 본문은 .story 안 hidden 블록으로도 실린다.
- 비밀값(값은 저장소에 없음, Cloudflare 대시보드/GitHub Secrets 에만): CLOUDFLARE_API_TOKEN, CLOUDFLARE_ACCOUNT_ID, GOOGLE_CLIENT_ID, ADMIN_EMAILS, HIT_SALT, TYPESAFE_API_KEY, (선택) RESEND_API_KEY.

## 매일 돌아가는 일(현재 클라우드 세션의 Routine 으로 실행 중)
- 매시 :08 파이프라인 점검(수집 회차·다이제스트·오묶음 → 이상 시에만 파티 보고)
- 06:00 현지 아침판(예약 발행 publish_at): KR·JP(21:00Z), TW·SG(22:00Z), AU(19:00Z), IN(00:30Z), EU 7개국(04:00Z, GB 05:00Z), BR(09:00Z), CA·US(10:00Z), MX(12:00Z)
- 절차: ops/ed/REGION_RUNBOOK.md. 편집 에이전트 = sonnet, 브리프 = ops/ed/MORNING_PROMPT.md 를 나라별로 채움(M6_*.md 예시).
- 번역: 번역데스크 세션(별도 클라우드 세션)에 "JOB: site/editions/<prefix><DATE>.html -> ko, ja, en".
- 이 Routine 들은 클라우드 세션에 묶여 있다. 로컬로 완전히 옮기려면 로컬 쪽 스케줄로 다시 만들고, 클라우드 Routine 은 사장님 확인 후 끈다.

## 진행 중(인계 시점)
- TW·SG 제6호(2026-10-10) 작성 중 → 미국 금요일 종가(20:00Z) 반영 후 등록·예약(22:00Z) 예정. 클라우드 세션이 마무리한다.
- 사장님 할 일: 네이버 서치어드바이저 소유확인, 구글 서치콘솔 사이트맵(전체 URL), Bing 가져오기, ADMIN_EMAILS 비밀값.

## 사장님 규칙(요약)
- 파티에는 한국어로 쓰고, 작업 전 '작업중' 표시를 먼저 한다. 디자인 톤앤매너 유지: 이모지·장식 화살표 금지, 링크는 옅은 점선(파란색 금지), 모든 것은 한 줄 기본.
- 각국 판은 그 나라 언어로만 쓴다. 두 매체 이상 확인된 사실만 쓰고, 나머지는 소문 블록에 넣는다.
- 비밀번호·토큰은 받지도 올리지도 않는다. 로그인·결제는 사장님이 직접 한다.
