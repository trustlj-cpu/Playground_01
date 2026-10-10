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
npm test                     # jest-expo + Testing Library (src/__tests__)
npm run lint                 # expo lint (eslint-config-expo)
```
환경변수는 `.env.example` 참고. fixtures는 `EXPO_PUBLIC_USE_FIXTURES=1`일 때만 번들에 들어갑니다(metro.config.js).

## 구조
- `src/app/` — 화면(expo-router): `(tabs)/index` 최신호 · `archive` 지난 호 · `glossary` 용어사전 · `bookmarks` 북마크 · `settings` 설정, `edition/[region]/[date]` 지난 호 지면
- `src/components/` — 제호(Masthead), 속보 띠(BreakingBar)·목록, 기사 카드, 기사 시트(팝업: 닫기 버튼 없음 — 바깥 탭·아래로 스와이프), 용어 툴팁, 블록 HTML 렌더러(허용 태그만), 인플루언서 상자
- `src/lib/` — API·캐시(`api.ts`, `useResource.ts`; 응답 모양 검사 `normalize.ts`; 캐시 파일 저장 `cacheStore.ts` — 기기의 문서 폴더
  `dd-cache/`, 합계 40 MB를 넘으면 오래된 것부터 지움. AsyncStorage에는 작은 목록만), 설정(국가판·언어·글자 크기·테마), 북마크(AsyncStorage), 용어 매칭(웹 linkTerms와 같은 규칙)
- `src/i18n/site.json` — 웹에서 뽑은 문구(팝업 라벨 국가판·언어별, 메뉴·설정·용어사전 문구). 갱신: `node scripts/from-site.js i18n ../site`
- `src/components/Intro.tsx` — 시작 화면(타자기 제호 애니메이션), `assets/sfx/` — 효과음(CC0, 출처 `assets/sfx/SOURCES.md`)
- `src/lib/account.ts` — 웹 계정 로그인·북마크 API(기능 플래그, 아래 "계정 연동")
- `assets/fonts/` — 서브셋한 Noto Serif KR/JP/Latin(OFL, `assets/fonts/OFL.txt`). 다시 만들기: `npm run fonts`
- `fixtures/` — 개발용 API 샘플. `node scripts/from-site.js fixtures ../site <빌드된 사이트 폴더>`로 다시 만듦.
  `site/build.js`가 `app/v1/`을 내보내게 되면 그 출력을 `fixtures/app/v1/`에 복사해도 됩니다.

## 배포(사장님이 한 번 해 주실 일)
1. expo.dev에서 프로젝트를 만들고 이 폴더에서 `npx eas-cli init` → `npx eas-cli update:configure`
   (`app.json`의 `updates.url` 자리표시자 `REPLACE-WITH-EAS-PROJECT-ID`와 `extra.eas.projectId`가 채워집니다)
2. GitHub 저장소 시크릿 `EXPO_TOKEN` 추가(expo.dev → Access tokens)
3. 이후 `app-mobile` 브랜치에 `app-native/**` 변경을 push하면 `.github/workflows/app-update.yml`이 타입검사·린트·테스트 후
   **preview** 채널로 OTA 업데이트를 올립니다. **production** 채널 OTA와 iOS·Android 스토어 빌드는 Actions에서 수동 실행(체크박스)할 때만.
   시크릿이 없으면 게시 단계만 건너뜁니다(EXPO_TOKEN은 EAS를 부르는 단계에만 전달).
- `runtimeVersion`은 `fingerprint` 정책: 네이티브 코드(모듈·app.json 네이티브 설정)가 바뀌면 런타임 버전이 저절로 달라져,
  그 OTA는 새 스토어 빌드에만 내려갑니다(예전 빌드에 맞지 않는 JS가 내려가 앱이 죽는 일 방지).
- 앱 식별자: iOS `bundleIdentifier`·Android `package` = `com.dailydropnewspaper.app`(site/app.json과 같음).
- 유니버설 링크/앱 링크: iOS `associatedDomains`=`applinks:dailydropnewspaper.com`, Android `intentFilters`(autoVerify) =
  `/20…`(호별), `/`, `/archive/`, `/glossary/` — 사이트 AASA와 같은 경로. 들어온 웹 주소는 `src/app/+native-intent.tsx`가 앱 화면으로 바꿉니다.
  지금 `https://dailydropnewspaper.com/.well-known/apple-app-site-association`·`assetlinks.json`이 404인 것은 정상입니다:
  `site/build.js`는 Apple Team ID와 Android 서명 SHA-256이 `site/app.json`에 채워진 뒤에만 그 파일을 만듭니다(개발자 계정 개설 후).
  그 전까지는 링크가 브라우저로 열립니다.
- eas.json 프로필: development / preview / production, 채널은 프로필 이름과 같음.

## 글꼴 크기 줄이기 (assets/fonts)
`scripts/subset-fonts.py`(fonttools + cffsubr: `pip install fonttools cffsubr`)가 `node_modules/@expo-google-fonts/*`의 원본 TTF에서
필요한 글자만 남기고 CFF(.otf)로 바꿔 서브루틴 압축합니다. 결과는 커밋해 둡니다(빌드 때 파이썬이 필요 없게).

| 글꼴 | 남기는 글자 | 원본 TTF | 결과 OTF |
|---|---|---|---|
| Noto Serif KR 400/700 | 한글 음절 11,172자 전부 + 자모 + 라틴·문장부호·㈜㎞ 등 + 신문에 쓰는 한자 약 400자(美·中·北·與·野·株 …) | 14.08 / 14.09 MB | 3.64 / 3.73 MB |
| Noto Serif JP 400/700 | 가나 + JIS X 0208 전부(1·2수준 한자 6,355자) + 라틴·문장부호 | 8.04 / 8.03 MB | 2.74 / 2.80 MB |
| Noto Serif 400/700/400i | 라틴·라틴 확장·그리스·키릴·베트남어 | 0.50–0.53 MB | 0.22 MB |
| 합계 | | 45.79 MB | 13.57 MB |

- 글자 모양은 그대로입니다(곡선 변환 오차 1 unit 이하, 힌팅만 제거 — iOS·Android는 TrueType 힌팅을 쓰지 않음).
- 목록에 없는 한자(한국어 지면)·JIS 밖 한자(일본어 지면)만 시스템 글꼴로 대체됩니다. 자주 보이면 `KR_HANJA`에 추가하고 `npm run fonts`.
- 런타임에 Google Fonts에서 받는 방식은 번들은 더 작지만 첫 실행·오프라인에서 시스템 글꼴로 보이므로 쓰지 않았습니다.
- `npx expo export` 출력(번들+에셋): iOS 48.6 → 17.5 MB, Android 49.9 → 18.7 MB, 폴더 전체(ios+android+web) 96 → 37 MB.
  JS 번들은 시작 화면용 reanimated 때문에 iOS 2.75 → 3.87 MB로 늘었습니다.

## 시작 화면 (Intro)
`dailydrop-app/inject/splash.js`를 그대로 옮겼습니다(react-native-reanimated + react-native-svg + expo-audio).
숫자는 원본과 같습니다: 글자별 자르기 좌표 `CHARS`, 찍는 자리 `PRINT_X=881`(894 폭 제호에서 마침표 오른쪽 끝 — 캐리지가 한 칸씩
왼쪽으로 가며 글자가 같은 자리에서 찍히고, 마침표는 최종 위치 그대로 찍힘), `T0=380ms`, 간격 300ms, 캐리지 120/80ms, 멈춤 420ms,
올라가기 520ms, 제호 폭 `min(330px, 84vw)`, 화면 가운데 정렬. 끝나면 최신호 화면의 제호 자리로 올라가 겹치며 사라집니다.
- 타임라인은 덮개가 실제로 그려진 뒤(requestAnimationFrame 두 번) 시작합니다 — 느린 첫 실행에서 타이머가 쌓였다가 한꺼번에 터지지 않게.
- 앱을 새로 켤 때 한 번만, 화면을 누르면 건너뜀, 기기의 '동작 줄이기'가 켜져 있으면 생략. 설정 → 시작 화면에서 애니메이션·소리를 끌 수 있습니다.
- 소리는 무음 모드를 따르고(`playsInSilentMode:false`) 다른 앱 음악을 멈추지 않습니다(`mixWithOthers`). 웹 빌드는 자동재생 제한 때문에 무음.
- `assets/sfx/SOURCES.md`는 원본 녹음 목록입니다. 앱에 든 파일 = 그중 Underwood No.11 단발(key-underwood), 1930년대 Mercedes 단발
  8개(key-mercedes-01…08), 캐리지 틱, 마침표용 가벼운 타건 — 모두 CC0.

## 계정 연동 — 북마크 동기화 (기능 플래그 `EXPO_PUBLIC_ACCOUNT_SYNC=1`, 기본 꺼짐)
앱 쪽은 다 만들어 두었습니다: 설정 → 계정 → 로그인(시스템 인증 브라우저로 사이트 `/login/`), 토큰은 기기 보안 저장소(expo-secure-store),
북마크는 기기 저장이 그대로 오프라인 캐시이고 로그인하면 양방향 동기화됩니다.
- 처음 로그인할 때: 기기 목록과 계정 목록을 합침(기기에만 있던 것은 계정에 올림).
- 그 뒤: 앱 시작·포그라운드 복귀·북마크를 누를 때마다 동기화. 계정 목록이 기준이라 웹에서 지운 것은 앱에서도 사라짐.
  오프라인에서 누른 것은 보낼 목록(outbox)에 쌓였다가 연결되면 보냄.
- 서버 기준 같은 북마크: 기사 = (region, date, ref=기사 data-id), 용어 = ref(용어). 앱이 보내는 값은 웹과 같은 형식
  (`title`=제목, `url`=`/<prefix><date>/[<lang>/]#<id>`, 용어 `note`=뜻 380자).
- 로그아웃하거나 세션이 만료(401)되면 기기 북마크는 남기고 동기화만 멈춥니다.
- 웹 빌드(react-native-web)에서는 플래그와 관계없이 꺼져 있습니다(다른 출처라 쿠키·CORS가 안 맞음).

### 서버(site Worker, `site/src/account.js`)에 필요한 변경 — 이게 있어야 플래그를 켤 수 있습니다
지금 사이트 로그인은 HttpOnly `dd_sid` 쿠키(SameSite=Lax) + 쓰기 요청의 `Origin` 같은 출처 검사입니다. 네이티브 앱은 시스템 브라우저의
쿠키를 읽을 수 없고 같은 출처 `Origin`도 보낼 수 없으므로, 로그인한 브라우저 세션을 앱 토큰으로 바꿔 주는 단계가 필요합니다
(OAuth 2.0 for Native Apps, RFC 8252 + PKCE RFC 7636 방식). `index.js`의 `ACCOUNT_API` 정규식은 `/api/auth/…`를 이미 넘기므로 그대로 둡니다.

1. **D1 표 추가** (`schema.sql`)
   ```sql
   CREATE TABLE IF NOT EXISTS app_codes (
     code_hash TEXT PRIMARY KEY,      -- SHA-256(code)
     user_id INTEGER NOT NULL,
     challenge TEXT NOT NULL,         -- PKCE S256 code_challenge (base64url)
     expires_at INTEGER NOT NULL      -- ms epoch, 발급 + 60초
   );
   ```
2. **`GET /api/auth/app/start?redirect_uri=&state=&code_challenge=&code_challenge_method=S256`** (GET이라 Origin 검사 대상 아님)
   - `redirect_uri`는 허용 목록과 **정확히 같아야** 함: `dailydrop://auth` (개발용 Expo Go를 쓰려면 `exp://` 로 시작하는 주소를 따로 허용).
     `state`는 `[A-Za-z0-9_-]{16,128}`, `code_challenge`는 base64url 43자, method는 `S256`만. 하나라도 틀리면 400.
   - 쿠키 세션이 있고 `active(env,u)`이면: 32바이트 무작위 `code`를 만들어 `app_codes`에 (sha256(code), u.id, challenge, now+60s) 저장 →
     `302 Location: <redirect_uri>?code=<code>&state=<state>`, `cache-control: no-store`.
   - 로그인 안 됐으면: `302 /login/?next=<이 주소 전체(경로+쿼리)를 encodeURIComponent>`. 로그인 페이지의 `safeNext()`가 `/api/...` 경로를
     이미 허용하므로 로그인 성공 후 이 주소로 돌아와 앱으로 넘어갑니다(로그인 UI 변경 없음). Google 로그인도 같은 흐름으로 됩니다.
3. **`POST /api/auth/app/token` `{code, code_verifier}`** → `{ok:true, token, user: publicUser(...)}`
   - Origin 검사에서 **제외**(쿠키를 쓰지 않으므로 CSRF 대상이 아님). `limited()` 속도 제한은 적용.
   - `app_codes`에서 sha256(code) 행을 찾아 **바로 삭제**(1회용), 만료·없음이면 400 `code_expired`.
     `b64u(SHA-256(code_verifier)) === challenge`가 아니면 400 `pkce`.
   - `sessions`에 새 행(기존 `newSession`과 같은 30일, ua는 요청 User-Agent)을 만들고 **토큰을 쿠키가 아니라 본문으로** 돌려줌.
4. **`currentUser()`가 `Authorization: Bearer <token>`도 받기**: `dd_sid` 쿠키가 없으면 헤더의 토큰(100자 이하)으로 같은 `sessions` 조회.
5. **CSRF 검사 완화**: `isWrite && !sameOrigin(...)` 대신 `isWrite && !sameOrigin(...) && !hasBearer(request)` — 브라우저는
   `Authorization` 헤더를 자동으로 붙이지 않으므로 Bearer 요청은 CSRF가 불가능합니다. (`/api/auth/app/token`은 3번대로 예외.)
6. **`POST /api/auth/logout`**: 쿠키 대신 Bearer 토큰이 오면 그 세션 행을 지움(앱 로그아웃).
7. 회원 탈퇴(`DELETE /api/me`)는 이미 `sessions`를 지우므로 앱 토큰도 함께 무효가 됩니다. 앱은 401을 받으면 로그아웃 상태로 돌아갑니다.

앱이 부르는 것: `/api/auth/app/start`(브라우저), `/api/auth/app/token`, `GET/POST/DELETE /api/bookmarks`(본문은 웹과 같음,
DELETE는 `{kind,region,date,ref}`), `POST /api/auth/logout`. CORS는 필요 없습니다(네이티브 fetch).
서버를 고친 뒤 `.env`(또는 EAS 환경변수)에 `EXPO_PUBLIC_ACCOUNT_SYNC=1`을 넣고 스토어 빌드를 새로 내면 됩니다.

## 이번 버전에서 바뀐 네이티브 모듈
react-native-reanimated·react-native-worklets·expo-audio·expo-web-browser·expo-secure-store·expo-crypto를 추가해 `version`을 1.1.0으로
올렸습니다(`runtimeVersion` = appVersion). OTA만으로는 1.0.0 빌드에 들어가지 않으니 스토어 빌드를 새로 내야 합니다.
