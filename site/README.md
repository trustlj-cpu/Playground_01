# site — 데일리드롭 웹

`node build.js editions.json` 이 `editions/*.html`(각 호의 1면 원본)에서 `public/` 을 만든다:
`/`(최신호) · `/YYYY-MM-DD/`(호별) · `/archive/` · `/glossary/`(모든 호의 용어 합산, 검색) · `/about/` · `/subscribe/`.
Cloudflare Workers 정적 자산으로 배포(`site-deploy.yml`, `site/**` 변경 시). 주소: https://dailydrop-site.trustlj.workers.dev → 도메인 연결은 Cloudflare 대시보드 → Workers & Pages → dailydrop-site → Settings → Domains & Routes.

새 호 추가: `editions/YYYY-MM-DD.html` 넣고 `editions.json`에 한 줄 추가 → 푸시.
