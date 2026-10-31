# Android 체크리스트 (kr.dailydrop.app)

## 빌드(코덱스 맥)
- Android SDK: compile/target SDK 36, build-tools 36.x, cmdline-tools. JDK 21 (codex-mobile 프로젝트 기준).
- `cd android && ./gradlew assembleDebug` → `app/build/outputs/apk/debug/app-debug.apk` (사장님 폰 설치본, '출처를 알 수 없는 앱' 허용 필요).
- 출시용: `./gradlew bundleRelease` → AAB. 서명키는 Play App Signing 사용(업로드 키만 로컬 보관, 저장소에 올리지 않음). 업로드 키 SHA-256 지문을 `site/app.json`의 `android.sha256_cert_fingerprints`에 넣으면 assetlinks.json이 생성됨(Play App Signing 쓰면 **Play 콘솔의 '앱 서명 키' 지문**도 함께 넣을 것).

## AndroidManifest.xml
- 딥링크(App Links):
  ```xml
  <intent-filter android:autoVerify="true">
    <action android:name="android.intent.action.VIEW"/>
    <category android:name="android.intent.category.DEFAULT"/>
    <category android:name="android.intent.category.BROWSABLE"/>
    <data android:scheme="https" android:host="dailydrop.kr"/>
    <data android:scheme="https" android:host="www.dailydrop.kr"/>
  </intent-filter>
  ```
- 알림: `<uses-permission android:name="android.permission.POST_NOTIFICATIONS"/>` (Android 13+ 런타임 요청은 모듈의 enablePush가 처리). 알림 채널 id `edition`(이름 '저녁판 발행') — Worker가 이 channel_id로 보냄.
- `android:usesCleartextTraffic="false"`, `android:allowBackup="false"`(오프라인 호 데이터는 Filesystem Data 디렉터리).

## Firebase(사장님 생성 → 코덱스에게 직접 전달, 파티 업로드 금지)
- 프로젝트 `dailydrop` → Android 앱 추가(패키지 kr.dailydrop.app) → `google-services.json`을 `android/app/`에.
- 서비스 계정 키(JSON, 역할 'Firebase Cloud Messaging API 관리자') → Worker 시크릿 `FCM_SERVICE_ACCOUNT`로 등록: `cd feed/worker && npx wrangler secret put FCM_SERVICE_ACCOUNT < service-account.json`.
- 플러그인: `@capacitor/push-notifications`(FCM 자동 연결).

## Play Console '데이터 보안' 답안
- 수집: 없음(앱 기능상 기기 토큰만 서버 전송 — '기기 또는 기타 ID' 항목에 "앱 기능(알림)" 목적으로 표기, 공유 없음, 선택 사항, 사용자가 삭제 요청 가능).
- 전송 암호화: 예. 삭제 요청 방법: 앱에서 알림 끄기(토큰 비활성화) + /privacy/ 안내.
- 광고 ID: 사용 안 함. 타깃 연령: 전체. 뉴스 앱 카테고리 → '뉴스 앱' 선언 필요(출처 명시·편집 정책 URL = /about/).

## 내부 테스트(등록 즉시)
- Play Console → 테스트 → 내부 테스트 → AAB 업로드 → 테스터 이메일(사장님) 추가 → 링크로 설치. 14일 조건은 '비공개 테스트 → 프로덕션' 전환에만 적용.
