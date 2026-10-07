# Compact Android header verification — 2026-10-07

Request: room743,746,748: reduce space above articles and use a newspaper masthead/date layout.

The app toolbar now occupies60 CSSpx. Website access, push state and the static offline guide are in More; errors and new-edition notices remain visible. The newspaper compression from d3262c1 is applied to bundled1–3 and newly transformed remote editions. Existing source-snapshot originals were not edited. The logo design remains unchanged pending the user's selection.

Actual API36 Android emulator,412×815 CSSpx app viewport:

| Metric | Before | After |
|---|---:|---:|
| Reader starts |147.90px|60px|
| First headline starts |509.02px|224.69px|

The first headline moved upward284.33px (56%). Coordinates exclude Android system bars. All3 bundled editions start at the same measured position and the first2 have no horizontal overflow. Native screenshots were captured using adb; final screenshots were inspected for native overlays.

Checks: More retains website and disabled/unconfigured push access; tapping the reader or Android Back closes More; article and term open; Back closes term then article; archive navigation remains visible; glossary search works; saved edition remains after APK upgrade. See native-results.json and native.cjs.

14 unit tests and7 browser regressions passed after integration. Browser remote tests use intercepted fixtures, not a real newly published edition. Final native checks exercise the installed debug APK. No physical Android phone, real push delivery, production signing or store release was tested. iOS is outside this Android revision.
