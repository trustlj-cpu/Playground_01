# Android verification of Claude's masthead revision

2026-10-07, source d008a54 on app-mobile, integrating Claude's fa2a742 site snapshot. Design remains Claude's responsibility following room766; this pass builds and verifies the supplied design without additional design changes. The earlier monochrome app-shell commit b6e3465 is in the supplied branch.

The bundled paper uses the supplied blackletter masthead and a copyright/date/issue line between thin rules. The source snapshot was consumed through the build's staging copy, not directly edited by Codex.

Actual Android API36 emulator,412×815 CSSpx viewport: toolbar60px, first headline198.39px (previous compact edition224.69px; original509.02px). All3 bundled editions were opened. Native screenshots from adb were visually inspected.

Wi-Fi and mobile data were disabled, the app process stopped and restarted. The native reader reported the embedded DD Blackletter face loaded and used by the masthead. Copyright, Seoul date, and issue number were all visible. Network was restored in the verifier's finally block.

8 native checks pass: offline embedded font/dateline; headline position; More/website/unconfigured push and dismissal; article/term/native Back; archive navigation; earlier editions/no horizontal overflow; glossary search; retained saved edition after APK upgrade. A first earlier-edition geometry assertion ran before layout stabilized; the verifier now awaits document.fonts.ready and two animation frames before measuring. No app patch was needed for this.

14 unit tests and7 browser regression tests pass. The browser remote-edition checks use intercepted fixtures, not a real publication. Additional320/390px light and390px dark shell checks pass with60px toolbar and no horizontal overflow. These are browser checks, distinct from native checks.

No physical-device test, real push delivery, production signature, store release or iOS runtime validation. Updated debug APK is local under releases/2026-10-07; source and QA only are pushed. The emulator is left on the latest issue.
