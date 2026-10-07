# Claude 앱 통합 인계 검토본

전송 예정 대상: 공개 GitHub `trustlj-cpu/Playground_01`, 새 브랜치 `app-mobile`, 독립 디렉터리 `codex-mobile/`.
상태: 방의 사용자 seq665·669에서 공개 app-mobile 진행 승인. Codex 독립 디렉터리로 인계합니다.

## 구성과 범위

`src/`, `scripts/`, `tests/`, `ios/`, `android/`, package 설정, 공개 출처의 `source-snapshot/` 및 작은 SwiftPM 메타데이터를 포함합니다. 정확한 경로·크기·SHA-256은 `HANDOFF_FILES.json`에 있습니다. 빌드 결과, 로그, node_modules, 로컬 SDK 경로, 사용자 Xcode 설정, 서명 파일, 자격증명 파일, Swift 바이너리는 제외합니다.
기존 저장소 파일과 Claude 원본을 수정하지 않고 독립 앱 디렉터리로 추가할 계획입니다.

## 의존성 복원

1. `npm ci`를 실행합니다.
2. 공식 릴리스 https://github.com/ionic-team/capacitor-swift-pm/releases/tag/8.5.2 에서 `Capacitor.xcframework.zip`, `Cordova.xcframework.zip`을 받습니다. 각 파일의 SHA-256이 `native-packages/capacitor-swift-pm/PROVENANCE.json`과 일치하는지 먼저 확인합니다.
3. 두 파일을 `native-packages/capacitor-swift-pm/` 아래 풀어 각각 `Capacitor.xcframework`, `Cordova.xcframework`가 그 디렉터리에 바로 놓이도록 합니다. 기존 검증된 로컬 바이너리는 이 Mac에 보존되어 있습니다.
4. `npm run sync` 후 `npm test`를 실행합니다. sync는 웹 자산 생성과 native sync, 로컬 SwiftPM 연결을 수행합니다.
5. Xcode 빌드 명령과 실제 검증 범위는 README.md를 따릅니다. 이 복원 절차는 새 환경에서 아직 재실행하지 않았습니다.

## 역할 제안과 남은 확인

Claude 제안: editions.json 새 호 갱신, 오프라인 캐시, 딥링크, 푸시 서버 초안. Codex는 공유된 변경을 별도 사본에서 통합·빌드 검수합니다. 현재 단위 검사4개 및 무서명 iOS 컴파일이 통과했으며 실제 기기·Android 빌드는 미검증입니다.
앱 식별자는 `kr.dailydrop.app`, 웹 데이터는 4504fb3 기준 1~3호·93개 용어입니다. 최신 3호·97개 용어와 자동 갱신·푸시는 아직 통합되지 않았습니다.
사용자가 Apple 개발자 비용을 직접 결제하겠다고 한 것은 확인했으나, 가입 완료·서명·스토어 업로드 승인은 확인하지 않았습니다.
