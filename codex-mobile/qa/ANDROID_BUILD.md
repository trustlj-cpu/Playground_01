# Android verification — 2026-10-07

App: `kr.dailydrop.app`, label `데일리드롭`, min SDK 24, target/compile SDK 36.

The content snapshot is `333c697` (three editions and 97 glossary terms). This report also covers the native fixes in the same commit as this file. Android plugin registration was regenerated with `npx cap sync android` (App, Browser, Filesystem, Preferences, PushNotifications).

## Verified

- JDK 21, Gradle 8.14.3, Android SDK 36; debug APK build passed.
- APK signature v2 verification passed; package ID, SDK levels and launchable activity inspected with Android build tools.
- Packaged `assets/public/app.js` exactly matches the web bundle tested locally.
- 13 unit tests and 7 headless Chrome regression scenarios passed. `browser-results.json` lists their scope. Remote editions in those browser tests are synthetic intercepted fixtures, not evidence of an actual new issue being published.
- Android and iOS push capability flags are false in this build. Registration is not called without configuration.
- Android 16 / API 36 AOSP arm64 emulator, WebView 133: all 8 native smoke scenarios passed in one run. These cover launch; article/term back navigation; glossary search; offline Preferences persistence across process restart; explicit HTTPS intent; three WebView reloads; synthetic remote Filesystem download/render; and remote reading/bookmark restoration after an offline process restart. See `android-results.json`.
- External HTTPS opening launched the emulator’s `org.chromium.webview_shell` browser activity successfully; this does not verify every physical-device browser provider.
- The synthetic issue was cleared from the disposable emulator after testing, then the real bundled third edition was reopened.
- Final Android lint: 0 errors, 15 warnings (dependency versions and generated/launcher resources); these warnings remain.
- Debug APK: 6,940,372 bytes; SHA-256 `ae756c5eb7f8def61048d9ade888c39e4597a3784d6df4193aefbba6bbd2caaf`. APK v2 signature verified and embedded JavaScript matched the tested bundle. The APK stays in the local ignored `releases/2026-10-07/` folder.

- The final metadata-only layout adjustment was checked at 393 px in Chromium and on the native WebView: the three dateline rows do not overlap.

## Native fixes found during testing

- A DevTools reload once left startup waiting for a Preferences read. Reads now have a 2-second timeout and one retry; writes are never automatically repeated. Unit tests cover a lost reply, a permanently missing reply and an explicit plugin error. The secure modern Capacitor bridge remains enabled.
- Background prefetch and an immediate user tap raced two Filesystem writes for the same edition. Native logs showed `OS-PLUG-FILE-0010`. Both callers now share a single in-flight promise per date; failure removes the promise so a later tap can retry. This is covered by concurrency and failure-retry tests.

## Pending

- Physical Android-device testing and actual browser-provider behavior.
- Real push delivery: Firebase setup, server credentials and physical-device delivery are not configured or verified by this build.
- Verified Android App Links require a domain association with the intended signing certificate. An explicit app intent alone is not proof of automatic verified-link routing.
- Release signing, store publication and iOS account activation are outside this debug build result.

## Reproduce

Use Node dependencies from `npm ci`, JDK 21 and an Android SDK containing platform 36 and the build tools requested by Gradle. Keep SDK and Gradle caches outside this source checkout.

```sh
npm run build
npm test
npx cap sync android
cd android
sh gradlew :app:assembleDebug
```

The local environment needed `JAVA_TOOL_OPTIONS=-Djava.net.preferIPv4Stack=true` for Java downloads. This is a network workaround, not a TLS-verification bypass. The older SDK command-line wrapper also mishandled spaces in the tool path; invoking its Java entry point with separate arguments avoided that issue.

Browser regression: serve `web/` on localhost port 4181, set `PLAYWRIGHT_MODULE` to an installed Playwright module and `CHROME_PATH` to a Chromium executable, then run `node qa/browser-regression.cjs`. It creates a fresh browser profile and does not use a personal browser session.


Native smoke test: use a disposable API 36 emulator on ADB port 5038, serial `emulator-5580`, with the APK installed and launched. Set `PLAYWRIGHT_MODULE` and `ADB_PATH`, then run `node qa/android-smoke.cjs`. This test changes only the disposable app state, temporarily toggles the emulator network, and intercepts a synthetic remote edition; it is not for a personal device. Clear this test app's data after the test to remove the fixture.
