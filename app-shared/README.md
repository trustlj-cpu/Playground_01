# app-shared
앱(iOS·Android, Capacitor)과 웹이 공유하는 로직. 빌드 산출물 아님.

> 2026-10-07: 실제 앱 통합본은 `app-mobile` 브랜치 `codex-mobile/src/remote.mjs`(정적 import, 결과 반환형)입니다. 아래 `dailydrop-app.js`는 참고용 초안이며 가변 import 등 코덱스 지적 사항은 통합본에서 수정됐습니다.

- `dailydrop-app.js` — 새 호 폴링(`/editions.json`, 30분), 호 HTML 오프라인 저장(Filesystem→KV 폴백), 푸시 토큰 등록/해제(`feed.dailydrop.kr/push/*`), 딥링크(`/YYYY-MM-DD/`) 처리. 콜백: `onOpenEdition(date, html)`, `onIndex(index)`, `onPushState(state)`.
- 플러그인은 있으면 쓰고 없으면 폴백(웹에서도 동작). 필요한 Capacitor 플러그인: `@capacitor/preferences @capacitor/filesystem @capacitor/push-notifications @capacitor/app`.
- iOS 푸시 수신에는 Xcode의 Push Notifications capability + Background Modes(Remote notifications), APNs 키는 Worker 시크릿(`feed/README.md`).
- 테스트: 웹 번들에서 `new DailyDrop({onOpenEdition:(d,h)=>…}).start()`로 목록·저장·열기 확인 → 네이티브에서 푸시·딥링크 확인(Codex 맥).
