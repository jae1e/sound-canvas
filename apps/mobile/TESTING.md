# On-device test checklist (first version, all three modes)

Status (2026-11-03): everything below is **untested on a device**. Unit tests cover the pure logic (parsers, routing, mic arbitration with fakes, persistence, walk log). Run this list on the phone after `npx expo run:android` (release builds also work). Share the Diagnostics log (Settings > Diagnostics > Share log) if anything fails; it contains `stt_paused_for_take`, `stt_resumed`, `location` and TTS route events.

Common prerequisites: microphone, notification and (Travel Guide) fine-location permissions granted; models downloaded from Settings > Diagnostics if you want sherpa fallback (platform STT is the default); earbuds connected for the routing checks.

## Cross-mode

- [ ] Home shows three mode cards with no "coming in M2/M3" text. A started mode shows an "Active" badge and a "Resume ..." card at the top.
- [ ] Start Travel Guide's voice session, then open Voice Coach: the bar says Travel Guide is using the voice session and offers "Open Travel Guide". Starting Work Partner listening fails with a clear message. End Travel, then Voice Coach starts.
- [ ] A begun Work Partner session blocks the Travel Guide and Voice Coach start buttons the same way.
- [ ] Settings > Language Auto: after you speak English to a Korean-device session, mode screens and spoken replies follow the detected language. Fixed ko or en always wins.
- [ ] Nothing is ever spoken without a started session, and nothing plays automatically. With earbuds connected, speech goes to the earbuds; the phone speaker is used only when Settings forces it.
- [ ] "Stop" on the notification ends the session and the mode screen returns to the Start button.

## Work Partner

- [ ] Create a plan, Begin, say "next step", "set a timer for 2 minutes", "memo: check the glue". The timer cue is spoken with the screen off. The note appears in Journal with the step label.
- [ ] End the session: a generated summary appears in Journal.

## Travel Guide

Mock mode (no `expo.extra.travel` in `app.json`, the default): the screen shows "Mock data mode".

- [ ] Start voice session. A GPS fix appears ("session location"). Without the location permission the session still starts and the screen says GPS is missing.
- [ ] Say "what's around here?" / "근처에 카페 있어?": the answer is spoken and the mock places appear. Tap a result: route preview is shown. Tap "Save place" on a result; it shows "Saved" (a row in `places`).
- [ ] Say "take me to the first one", then "yes" (or press Start). Press the "test" button to walk the mock polyline without moving: turn cues and "arrived" are spoken.
- [ ] "How much farther?" / "얼마나 남았어?" and "where am I?" are answered.
- [ ] Walk outdoors for a few minutes with the **screen locked**. Unlock: the position moved, and (when navigating) cues were spoken while locked. Confirms location events reach `TravelController` from the service.
- [ ] Say "메모: 여기 다시 오고 싶다" / "note: come back here". Journal has a travel note with a location (and a place link when near a saved place or the destination).
- [ ] End the session. Journal gets a generated summary (distance, minutes, destination, number of notes) and the `routes` table gets the walk log.
- [ ] Real mode: set `expo.extra.travel {baseUrl, token}` in `app.json`, rebuild, repeat the search and route checks (needs the deployed Worker, see `services/worker`).

## Voice Coach

- [ ] Open Voice Coach without starting a session: record a take with the button. It is analysed and a short feedback text appears; nothing is spoken.
- [ ] Start the voice session. Record a take (button, or say "start take"). During the take, the log shows `stt_paused_for_take`; after it, `stt_resumed`. The take is not polluted by the platform recognizer (no recognizer beep in the recording, pitch tracking works).
- [ ] After the take, the feedback is spoken through the earbuds. Say "play it back": the take plays. Say "same block again": the selected block runs again. Say "note: second phrase was flat" or "이 테이크 메모: 박자 놓침": the note appears under the latest take and as a Journal entry linked to the take.
- [ ] Type a take note in the text field; wait a second; it appears in Journal (voice_coach). Deleting the take keeps the Journal text and drops the link.
- [ ] Restart the app: practice blocks, takes (with notes) and their WAV files are still there.
- [ ] Live pitch ("monitor") pauses session STT while on and resumes it when turned off.
- [ ] Speech-mode blocks: speaking rate and pauses come from audio energy. Filler-word counts need a transcript, which is not available while the mic is held for the take (see gaps below).

## Known gaps to keep in mind while testing

- Speech-mode transcript and word timestamps are not passed to Voice Coach: the platform recognizer is paused during a take and gives no word timestamps anyway.
- Timers started by voice in Travel Guide or Voice Coach are announced by a JS tick, not by the native cue scheduler; if the OS freezes JS in the background they may be late (Work Partner uses native cues).
- If session STT has fallen back to sherpa capture, it is not paused during takes (only the platform recognizer is).
- The walk log lives in memory until the session ends; a killed app loses the unsaved part of that walk.
- The last-used language for Auto mode is kept in memory only.
