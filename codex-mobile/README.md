# 데일리드롭 Codex 앱 시작본

2026-10-07 방 요청 seq628에 따라 만든 별도 개발 복사본입니다. 기존 Claude 코드·데이터베이스·배포는 변경하지 않았습니다.

## 현재 구현

- Capacitor 8.5.2 iOS / Android 프로젝트.
- 공개 웹 소스 커밋 `4504fb3378b91901ecb7bbe911af508ee76eeaa2`의 1–3호를 앱에 포함. 기사 펼침과 용어 설명, 93개 용어 검색을 유지합니다.
- 최근 호 / 지난 호 / 용어사전 / 보관함, 호별 보관·해제. 보관은 iOS UserDefaults, Android SharedPreferences, 웹에서는 localStorage입니다.
- 신문 자산이 앱에 포함되어 읽는 데 인터넷이 필요하지 않습니다. 추가 호 자동 다운로드는 아직 없습니다. 화면에 오프라인 사본임을 표시합니다.
- 최신 웹과 HTTPS 외부 링크는 별도 Browser 플러그인으로 엽니다.
- 앱 식별자는 개발용 `kr.dailydrop.app`입니다. 정식 배포 식별자 등록은 하지 않았습니다.

## 실행

```sh
npm ci
npm run sync
npm test
npm run preview
```

미리보기: http://127.0.0.1:4173 (로컬 개발용)

iOS 프로젝트: `ios/App/App.xcodeproj`. 시뮬레이터 무서명 빌드:

```sh
xcodebuild -project ios/App/App.xcodeproj -scheme App -configuration Debug -sdk iphonesimulator -destination 'generic/platform=iOS Simulator' -derivedDataPath .build/local-ios CODE_SIGNING_ALLOWED=NO build
```

원래 SwiftPM의 공식 원격 바이너리 해석이 5분 이상 진전 없이 대기하여 해당 Codex 빌드만 중단했습니다. 같은 8.5.2 릴리스 바이너리를 직접 다운로드하고 공식 Package.swift의 SHA-256을 검증한 뒤 `native-packages/capacitor-swift-pm`으로 연결했습니다. `scripts/use-local-ios.mjs`가 cap sync 뒤 로컬 의존성을 연결합니다. 공식 파일 출처·해시는 그 디렉터리의 PROVENANCE.json에 있습니다. 로컬 패키지 폴더를 보존해야 합니다.

## 확인한 범위

- 웹 자산 빌드, cap sync iOS / Android 성공.
- 상태 복구 / 저장 ID 검증 / 저장 전환 / 위험 URL 차단 단위 검사 4개 통과.
- 실제 Codex 브라우저 UI에서 3호 표시, 기사 펼침, 93개 용어와 군집위성 검색, 보관 후 보관함 표시, 새로고침 후 보관 유지, 지난 호에서 2호 이동·보관 대상 표시를 확인했습니다.
- 390×844 브라우저 화면을 육안 확인했습니다. 이것은 실제 휴대폰 검증이 아닙니다.
- Xcode 27.0 / iOS 27 SDK의 무서명 시뮬레이터 빌드 성공. `ios-build-local.log` 끝의 BUILD SUCCEEDED 확인. 생성 앱은 `.build/local-ios/Build/Products/Debug-iphonesimulator/App.app`입니다.
- iOS 시뮬레이터 앱 실행·실기기 설치·네이티브 보관 지속성·Android 뒤로가기/빌드는 아직 검증하지 않았습니다. Android Java 런타임은 현재 확인되지 않았습니다.
- 원본 복사 파일 6개의 SHA-256이 PROVENANCE와 일치함을 확인했습니다. 본문의 뉴스 사실 자체를 이번 앱 작업에서 재검증하지 않았습니다.

## 남은 작업

새 호 갱신, 푸시 알림, 위젯, 정식 아이콘, 기기별 실제 테스트, 접근성 상세 점검, 스토어용 개인정보 안내가 남았습니다. Claude 앱 본체 커밋이 공유되면 그 별도 복사본으로 iOS 통합 검수를 이어갑니다.

계정 결제·계약 동의·앱 서명·TestFlight 업로드·스토어 제출은 하지 않았습니다. Apple 연 US$99, Google Play 1회 US$25는 공식 일반 가입비 안내이며 실제 청구는 각 계정 화면에서 확인해야 합니다.

개발 도구의 npm audit는 CLI → xcode → uuid 경로의 moderate 3건을 보고했습니다. 앱 런타임이 아닌 개발 의존성 경로이며 자동 강제 다운그레이드는 하지 않았습니다.

## 공식 자료

- https://developer.apple.com/programs/
- https://developer.apple.com/help/account/basics/about-your-developer-account
- https://support.google.com/googleplay/android-developer/answer/6112435?hl=ko
- https://support.google.com/googleplay/android-developer/answer/14151465?hl=ko (신규 개인 계정: 최소 12명·연속 14일)
- https://capacitorjs.com/docs/apis/preferences (UserDefaults 사유 CA92.1)

## 원격 호의 신뢰 범위 (2026-10-07 통합 메모)
- 앱이 내려받아 여는 HTML은 `mergeEditions`가 `https://dailydrop.kr/` 아래 주소만 허용하고 TLS로 받는다. 즉 번들 콘텐츠(같은 사이트 빌드)와 같은 신뢰 수준이며, 제3자 HTML은 열지 않는다.
- 그 HTML의 inline script는 iframe(same-origin)에서 실행되므로 이론상 parent에 접근할 수 있다. 사이트 배포 권한이 곧 앱 콘텐츠 권한이라는 뜻이라, 사이트 저장소·Cloudflare 토큰 관리가 앱 보안의 일부다. 더 좁히려면 원격 호에 `allow-same-origin` 없는 샌드박스를 쓰고 frame.js 연동을 postMessage('*')+검증으로 바꾸는 방안이 있다(미적용).

## 앱 안 호 상단 압축 (`IN_APP_CSS`)
`src/remote-pure.mjs`의 `IN_APP_CSS`가 호 HTML `<head>`에 들어간다 — 원격으로 받은 호는 `transformEditionHtml`에서, 번들 1~3호는 `scripts/build.mjs`에서(호 페이지 `index.html`·`YYYY-MM-DD/index.html`만, 용어사전·소개 등은 제외). 사이트 메뉴(.dd-nav)와 안내문은 숨기고 제호 한 줄 → 코스피·환율 한 줄 → 날짜줄 순으로 접어 첫 기사가 390px 화면에서 약 220px 아래부터 보이게 한다. dailydrop.kr 자체 화면은 바뀌지 않는다.
