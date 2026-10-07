# Android verification — 2026-10-07

App: `kr.dailydrop.app`, label `데일리드롭`, min SDK 24, target/compile SDK 36.

The latest JavaScript reviewed in this report is `a591b0b`. Android plugin registration was regenerated with `npx cap sync android` (App, Browser, Filesystem, Preferences, PushNotifications).

## Verified

- JDK 21, Gradle 8.14.3, Android SDK 36; debug APK build passed.
- APK signature v2 verification passed; package ID, SDK levels and launchable activity inspected with Android build tools.
- Packaged `assets/public/app.js` exactly matches the web bundle tested locally.
- 8 unit tests and 7 headless Chrome regression scenarios passed. `browser-results.json` lists their scope. Remote editions in those browser tests are synthetic intercepted fixtures, not evidence of an actual new issue being published.
- Android and iOS push capability flags are false in this build. Registration is not called without configuration.

## Pending

- Native Android emulator/device installation, launch, persistence, external links, back button and deep links.
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
