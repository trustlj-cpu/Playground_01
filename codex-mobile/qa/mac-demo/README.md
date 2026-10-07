# MacBook Android demonstration — 2026-10-07

The final debug APK (source dbbe854, SHA256 ae756c5eb7f8def61048d9ade888c39e4597a3784d6df4193aefbba6bbd2caaf) was opened in a visible, Codex-owned API 36 emulator on this MacBook. Screenshots are captured from the emulator display, not a desktop browser.

Screens: latest issue, article, term popup, archive, saved issues after offline process restart, and offline reading. WiFi/mobile data are restored at completion and the latest issue remains open for the user.

During concurrent Xcode builds the emulator showed Quickstep/System UI ANR dialogs. Xcode builds were stopped to reduce load; final screenshots were recaptured. These checks are not a physical-phone performance test or real push-delivery validation.

## iOS limitation

The latest web assets and five Capacitor plugins were synchronized into the isolated iOS project. The local-SDK helper now also covers Filesystem and Push Notifications. The dependency lock resolves ion-ios-filesystem 2.0.0.

Creating a separate iPhone 17 / iOS 27 device set on the GPT external drive failed: CoreSimulator NSCocoaErrorDomain 513, underlying EPERM, while copying initial device data. No existing simulator data or security permissions were changed. Both unsigned builds were intentionally interrupted to reduce host load. Therefore this revision's iOS build and runtime are unverified.
