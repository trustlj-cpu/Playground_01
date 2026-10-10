# app-tv — 데일리드롭 TV (Apple TV · Android TV / Google TV)

Expo SDK 57 + **react-native-tvos 0.86.3-0** (`react-native@npm:react-native-tvos@0.86.3-0`, 폰 앱의 RN 0.86.3과 같은 버전) +
`@react-native-tvos/config-tv` 0.1.7. 내용은 폰 앱·웹과 같은 정적 JSON API(`https://dailydropnewspaper.com/app/v1/`)라
웹이 배포되면 TV도 자동으로 갱신됩니다(index 5분, 속보 60초, 포그라운드 복귀 시).

## 실행
```bash
npm install                      # .npmrc의 legacy-peer-deps: tvos 버전(0.86.3-0)이 프리릴리스 표기라 peer 범위에 안 맞음
npm run start:fixtures           # EXPO_TV=1 + fixtures
npm run prebuild                 # EXPO_TV=1 expo prebuild --clean (ios/·android/는 생성물, 커밋하지 않음)
npm run ios / npm run android    # tvOS 시뮬레이터 / Android TV 에뮬레이터 (Mac·Android SDK 필요)
npm run typecheck
npm run export:web:fixtures      # 브라우저 확인용(react-native-web): 방향키=D패드, Enter=OK, Esc/Backspace=뒤로
```

## 구조
- `src/App.tsx` — 화면 상태(Home · Reader · Past editions · Settings · Lean-back)와 오버레이(용어 · 속보), 유휴 타이머
- `src/screens/` — `Home`(메뉴 줄·제호·속보 띠·1면 그리드), `Reader`(전체 화면 기사), `Editions`, `Settings`, `Ambient`
- `src/components/` — `Masthead`(제호·시세 귀·날짜줄), `Ticker`, `StoryCard`, `Intro`(타자기 제호), 오버레이, `ErrorBoundary`
- `src/tv/` — 리모컨 계층: `remote.ts`(키·뒤로 스택, 활동 감지), `keysource.native.ts`(TVEventHandler·BackHandler·tvOS Menu),
  `keysource.ts`(웹: 공간 내비게이션 포커스 레이어), `Focusable`(포커스 링·확대), `FocusOwner`, `FocusTrap`, `scale.ts`(1080p 단위·5% 오버스캔 여백)
- `src/shared/` — app-native에서 복사한 모듈(각 파일 첫 줄에 원본 경로): API·캐시, 타입, 테마, 용어 매칭, HTML 파서, i18n/site.json,
  로고 경로, intro 숫자. 캐시는 TV용으로 바꿈: 파일 저장(expo-file-system, 웹은 AsyncStorage) + 용량 상한 LRU, 응답 형태 검사(`validate.ts`)
- `assets/tv/` — `npm run assets`(Playwright Chromium으로 로고에서 생성): Android TV 배너 320×180·아이콘, tvOS 아이콘·Top Shelf 자리표시자

## 리모컨
- Home: D패드로 카드 이동(포커스 링·확대), OK 기사 열기, 위쪽 메뉴 줄 최신호 · 지난 호 · 설정(국가판·언어)
- 기사: ▲▼ 스크롤, ◀▶ 점선 용어 고르기, OK 뜻 카드, 뒤로 닫기. 속보 띠에서 OK → 속보 목록
- N초(기본 60초, 설정에서 끔/30초/1/2/5분) 조작이 없으면 헤드라인 전체 화면 자동 넘김 — 아무 버튼이나 누르면 복귀
- 시작 화면: 폰 앱과 같은 숫자의 타자기 제호, 아무 버튼으로 건너뜀, TV에서는 소리 기본 끔

## 배포
`eas.json`의 모든 프로필은 `EXPO_TV=1`. `runtimeVersion`은 fingerprint 정책.
`.github/workflows/tv-update.yml`: `app-mobile`에 `app-tv/**` push → preview 채널 OTA, 수동 실행 → production OTA·스토어 빌드.
처음 한 번 `npx eas-cli init`으로 `REPLACE-WITH-EAS-PROJECT-ID`를 채우고 저장소 시크릿 `EXPO_TOKEN`을 넣어야 합니다(없으면 건너뜀).
