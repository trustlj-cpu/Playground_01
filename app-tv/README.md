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
npm test                         # jest: 키 맞는 데이터(T6), 유휴 타이머(T5), 속보 출처 라벨(T17), 지난 호 격자(T13), 응답 검증, 10피트 글자 하한
npm run assets                   # TV 아이콘·배너·스플래시 (Playwright 전역 설치 필요)
npm run fonts:tc                 # Noto Serif TC 서브셋(zh-TW) — scripts/subset-tc-font.py 머리말 참고
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

## 디자인 = 웹 (ops/app/DESIGN_RULE.md)
모든 시각 요소는 웹(site/nyt.css, build.js NAV·BREAK·BASECSS, 각 호 <style>)의 값을 그대로 쓰고 한 배율로만 키운다(`src/tv/web.ts`):
웹을 960px 창에서 조판한 모습(지면 928px)을 오버스캔 5% 안 폭에 맞춤 — 1920×1080 ×1.862, Android TV 960dp ×0.931.
예외는 10피트 글자 하한 하나: 960×540dp에서 12sp(1080p 24px) 미만인 웹 글자(키커 10.5px, 시세 11px 등)는 하한까지만 올림.
TV 고유는 리모컨 기계 장치뿐(포커스 = 웹 키보드 포커스 `outline:2px solid var(--red);outline-offset:4px`, 용어 커서, 자동 넘김 화면).
Home = 웹 1면(메뉴·제호·날짜줄·시세줄·속보 띠·6단 격자·색인·상자·판권), 기사 = 웹 팝업(.pop)을 1면 위에, 용어 = .tip, 속보 목록 = .brkl,
지난 호 = 보관함 .card(3열 격자), 설정 = 웹 설정(.crow·.tmode). 닫기 버튼 없음(뒤로/Menu, 카드 밖으로 방향키, OK 다시).

## 리모컨
- Home: D패드로 카드 이동(포커스 링·확대), OK 기사 열기, 위쪽 메뉴 줄 최신호 · 지난 호 · 설정(국가판·언어)
- 기사: ▲▼ 스크롤, ◀▶ 점선 용어 고르기, OK 뜻 카드, 뒤로 닫기. 속보 띠에서 OK → 속보 목록
- N초(기본 60초, 설정에서 끔/30초/1/2/5분) 조작이 없으면 헤드라인 전체 화면 자동 넘김 — 아무 버튼이나 누르면 복귀.
  유휴 시계는 키·포커스 이동·앱 복귀(AppState active) 때마다 새로 시작. 자동 넘김 중에는 화면 켜짐 유지(expo-keep-awake),
  번인 방지로 1분마다 몇 px 이동, 30분 뒤 어둡게, 2시간 뒤 종료하고 화면 켜짐을 풀어 시스템 화면보호기에 맡김
- 06:00 새 호가 나와도 읽던 호는 그대로(기사·뒤로 유지), 메뉴 줄에 '새 호' 표시 — 자동 넘김 중이거나 1면을 2분 이상 그대로 두면 미리 받아 둔 새 호로 바뀜
- 루트(1면 최신호)에서는 뒤로 처리기가 없어 tvOS Menu / Android 뒤로가 앱을 나감(Apple 요구 사항)
- 설정은 AsyncStorage + tvOS에서는 NSUserDefaults에도 복사(tvOS AsyncStorage는 Caches라 지워질 수 있음, Documents는 tvOS에서 영구 저장 불가)
- 시작 화면: 폰 앱과 같은 숫자의 타자기 제호, 아무 버튼으로 건너뜀, TV에서는 소리 기본 끔

## 배포
`eas.json`의 모든 프로필은 `EXPO_TV=1`. `runtimeVersion`은 fingerprint 정책.
`.github/workflows/tv-update.yml`: `app-mobile`에 `app-tv/**` push → preview 채널 OTA. 수동 실행은 기본 preview(OTA·빌드 프로필), production은 폼에서 직접 고를 때만.
처음 한 번 `npx eas-cli init`으로 `REPLACE-WITH-EAS-PROJECT-ID`를 채우고 저장소 시크릿 `EXPO_TOKEN`을 넣어야 합니다(없으면 건너뜀).
