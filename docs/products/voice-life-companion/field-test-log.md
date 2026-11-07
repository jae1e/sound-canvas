# Voice Coach — Field-Test and Issue Log

Every issue found in testing or review goes here: symptom, root cause, fix with commit, status, lesson. Claim labels: **M** measured, **U** user-observed, **I** inferred, **V** vendor-stated. Format and the earlier lessons follow [../industrial-voice-logging/field-test-log.md](../industrial-voice-logging/field-test-log.md) (FVL). Started 2026-11-07 with the Voice Coach renovation ([voice-coach-renovation-plan.md](voice-coach-renovation-plan.md)).

## VC-01 — The old app held the microphone and silenced Field Voice Log

- **Symptom (U, M), 2026-11-05.** Field Voice Log recordings were silent while Voice Life Companion was open in the background (FVL FT-03 / FT-04).
- **Root cause (M).** `vlc-session-service` captured with `VOICE_COMMUNICATION`. That capture is privacy-sensitive by default, so Android silenced other apps' recordings. The service could also come back without a user action.
- **Fix.** `dd81778` (merged in `ee8f154`):
  - `setPrivacySensitive(false)` on API 30+;
  - the service accepts only an explicit start intent and returns `START_NOT_STICKY`;
  - a `captureState` event reports when the capture is silenced.
  - In the app, P0 skips restoring Work, Travel and Routine sessions while the hidden modes are off.
- **Status.** Fixed in code; not yet verified on the device.
- **Lesson.** No listening session starts by itself. Coach takes never use VOICE_COMMUNICATION.

## VC-02 — Tab route group created as a literally quoted folder

- **Symptom (M), 2026-11-07 review.** The worker's commit `9dd1ddc` put the tab screens under `app/'(tabs)'/`, with the quote characters in the folder name, next to an empty `app/(tabs)/`. expo-router would not treat it as a group, and the old `app/index.tsx` and `app/settings/index.tsx` would have clashed with the tab routes.
- **Root cause (I).** A shell quoting slip when the worker created the folder. The type check, lint and `expo export` all passed, so none of the checks caught it.
- **Fix.** `a206438` (merged in `dd3ae5a`): the files moved to `app/(tabs)/`, the duplicate Home and Settings routes were removed, and `src/navigation/routeConflicts.test.ts` fails when two route files resolve to the same path.
- **Status.** Fixed (M: `pnpm check` 149 tests, `expo export` without route warnings). Not yet seen on the device.
- **Lesson.** Review the file list of every delegated diff, not only its test results. Route structure needs its own test.

## VC-03 — Server health check always "not reachable"

- **Symptom (I), 2026-11-07 review.** The Settings health check called `/v1/health` without a token. This server answers 401 without one, so the app would always show "not reachable".
- **Fix.** `a206438`: the check sends the bearer token, treats 401/403 as "reachable, not paired", times out after 5 s, and runs when the Settings tab is focused and after enrolment.
- **Status.** Fixed in code; not yet tested against the live server from the phone.
- **Lesson.** The contract already requires the bearer token on every endpoint except enrolment (api-v0 section 1). Worker prompts must point to the auth rules explicitly, and review must check delegated code against them.

## VC-04 — Home tab showed raw text keys, broken tab icons, and a title under the status bar

- **Symptom (U), 2026-11-07, build 446772.** The user's screenshot showed:
  - raw keys `tabs.home`, `tabs.sing`, … on the buttons and tab labels;
  - missing-glyph boxes as tab icons;
  - the "보이스 코치" title overlapping the status bar;
  - a bare Home: a raw "이어하기: 2026. 11. 6. 오후 8:51:36" line, and the Continue button repeated.
- **Root cause (M).**
  - `src/i18n/index.ts` prefixes every key with its file name, so `tabs.home` in `common.ts` is really `common.tabs.home`.
  - No `tabBarIcon` was set.
  - The tab screens hide the header and do not apply the top safe-area inset.
  - None of these show up in `pnpm check` or `expo export`.
- **Fix.** Sent to a Codex worker (branch `vc-p0-ui`):
  - correct the keys, and add a test that fails on any key missing in en or ko;
  - Ionicons tab icons;
  - tab headers handle the safe area;
  - a Home redesign with a Continue card and Song/Speech coach cards.
- **Status.** Fix in progress.
- **Lesson.** Reviewing the code is not enough for UI work. Before handing a build to the user, look at each screen on a device or emulator, or at least render the screens, and test that translation keys resolve.

## Releases

| Build | Commit | Date | Notes |
|---|---|---|---|
| 446772 (0.2.0) | `dd3ae5a` | 2026-11-07 | P0: Voice Coach name and tabs, hidden Travel/Work, server pairing, in-app update, mic-sharing fixes. 71.5 MB. On the server and the private GitHub draft (`voice-coach-446772-dd3ae5a.apk`). Signed with the same key as earlier builds (M: apksigner certificate SHA-256 `fac61745…`) |
