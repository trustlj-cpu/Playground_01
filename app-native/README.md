# app-native — 데일리드롭 네이티브 앱 (Expo · React Native · expo-router)

WebView 없이 지면을 네이티브로 그립니다. 내용은 웹 배포 때마다 `site/build.js`가 만드는 정적 JSON API
(`https://dailydropnewspaper.com/app/v1/`, 형식은 main 브랜치 `ops/app/API.md`)에서 읽으므로 **웹이 갱신되면 앱도 자동으로 갱신**됩니다
(앱 시작·포그라운드 복귀·당겨서 새로고침·5분마다 index 확인, 속보는 60초마다). 마지막으로 받은 JSON은 기기에 저장해 오프라인에서도 열립니다.

## 실행
```bash
npm install
npm start                    # 실제 API (EXPO_PUBLIC_API_BASE, 기본 production)
npm run start:fixtures       # fixtures/app/v1 로컬 데이터 (EXPO_PUBLIC_USE_FIXTURES=1)
npm run typecheck
```
환경변수는 `.env.example` 참고. fixtures는 `EXPO_PUBLIC_USE_FIXTURES=1`일 때만 번들에 들어갑니다(metro.config.js).

## 구조
- `src/app/` — 화면(expo-router): `(tabs)/index` 최신호 · `archive` 지난 호 · `glossary` 용어사전 · `bookmarks` 북마크 · `settings` 설정, `edition/[region]/[date]` 지난 호 지면
- `src/components/` — 제호(Masthead), 속보 띠(BreakingBar)·목록, 기사 카드, 기사 시트(팝업: 닫기 버튼 없음 — 바깥 탭·아래로 스와이프), 용어 툴팁, 블록 HTML 렌더러(허용 태그만), 인플루언서 상자
- `src/lib/` — API·캐시(`api.ts`, `useResource.ts`), 설정(국가판·언어·글자 크기·테마), 북마크(AsyncStorage), 용어 매칭(웹 linkTerms와 같은 규칙)
- `src/i18n/site.json` — 웹에서 뽑은 문구(팝업 라벨 국가판·언어별, 메뉴·설정·용어사전 문구). 갱신: `node scripts/from-site.js i18n ../site`
- `fixtures/` — 개발용 API 샘플. `node scripts/from-site.js fixtures ../site <빌드된 사이트 폴더>`로 다시 만듦.
  `site/build.js`가 `app/v1/`을 내보내게 되면 그 출력을 `fixtures/app/v1/`에 복사해도 됩니다.

## 배포(사장님이 한 번 해 주실 일)
1. expo.dev에서 프로젝트를 만들고 이 폴더에서 `npx eas-cli init` → `npx eas-cli update:configure`
   (`app.json`의 `updates.url` 자리표시자 `REPLACE-WITH-EAS-PROJECT-ID`와 `extra.eas.projectId`가 채워집니다)
2. GitHub 저장소 시크릿 `EXPO_TOKEN` 추가(expo.dev → Access tokens)
3. 이후 `app-mobile` 브랜치에 `app-native/**` 변경을 push하면 `.github/workflows/app-update.yml`이 production 채널로 OTA 업데이트를 올리고,
   Actions에서 수동 실행하면 iOS·Android 스토어 빌드를 시작합니다. 시크릿이 없으면 건너뜁니다.
- `runtimeVersion`은 `appVersion` 정책: 네이티브 모듈을 바꾸면 `version`을 올리고 스토어 빌드를 새로 내야 합니다.
- eas.json 프로필: development / preview / production, 채널은 프로필 이름과 같음.
