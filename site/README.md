# site — 데일리드롭 웹

`node build.js editions.json` 이 `editions/*.html`(각 호의 1면 원본)에서 `public/` 을 만든다:
`/`(최신호) · `/YYYY-MM-DD/`(호별) · `/archive/` · `/glossary/`(모든 호의 용어 합산, 검색) · `/about/` · `/subscribe/`.
Cloudflare Workers 정적 자산으로 배포(`site-deploy.yml`, `site/**` 변경 시). 주소: https://dailydrop.kr (임시 주소 dailydrop-site.trustlj.workers.dev 는 여기로 301). 피드: https://feed.dailydrop.kr

새 호 추가: `editions/YYYY-MM-DD.html` 넣고 `editions.json`에 한 줄 추가 → 푸시.

## 앱용 데이터
- `GET https://dailydrop.kr/editions.json` — `{site, generated_at, latest, editions:[{date,no,title,blurb,url,html}]}` 최신 호가 먼저. CORS `*`, 캐시 120초. 앱은 이 파일을 폴링(예: 앱 실행 시 + 매 30분)해 `latest`가 바뀌면 새 호 HTML(`html`)을 받아 오프라인 저장.
- 각 호 HTML은 독립 문서(폰트는 Google Fonts, 나머지는 인라인) → 오프라인 저장 시 폰트만 캐시하면 됨.
- `GET /privacy/` — 스토어 제출용 개인정보처리방침.
