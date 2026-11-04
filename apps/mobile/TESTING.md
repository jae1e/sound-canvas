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

## Work Partner routines: workout, stretching and Taegeuk 1 (added 2026-11-04, untested on a device)

Open Work Partner > "Workout, stretching and poomsae". Unit tests cover the routine model, parsers, pacing timeline and controller with fakes; everything below needs the phone. Use earbuds for the first pass, then repeat once on the phone speaker only if you chose "force speaker" in Settings (pacing itself never forces it).

**Setup**
- [ ] Type `squats 15 reps 3 sets, plank 45 seconds, rest 30 seconds` and tap Parse: the preview shows squats 15x3, plank 45 s and a rest item, and lists the defaults it assumed. Edit a number, Save as template, and see it under "Your routines". Repeat in Korean: `스쿼트 15개 3세트, 플랭크 45초, 세트 사이 휴식 30초` (rest should become 30 s for both items, no separate rest item).
- [ ] `햄스트링 스트레칭 좌우 30초` gives a left/right hold. `태극 1장 3번` gives Taegeuk 1 x3. `태극 3장` and free text such as `열심히 하기` appear under "Not understood" (LLM tier is a stub).
- [ ] Tap "Create routine by voice" and say `스쿼트 15개 3세트, 플랭크 45초`: a preview appears and a short reply is spoken. Say `start my last routine` / `어제 루틴 시작` after a finished run: it starts that routine; with no history it says so.

**Pacing (do this with the screen locked)**
- [ ] Start "Bodyweight workout". The "Preparing the voice" counter runs (first run: slower; second run: instant from the cache). Nothing is spoken before you tap Start.
- [ ] Squats: counts "하나, 둘, 셋..." on a steady 3 s beat, rest announcements ("휴식 30초", "다음 세트", "3, 2, 1"), then "다음: 푸시업...". Plank: "10초 남았어요", "3, 2, 1".
- [ ] Lock the screen mid-set: counting continues without gaps. Music from another app ducks (does not stop) while counting and recovers afterwards.
- [ ] Earbuds connected: counts play in the earbuds, not the phone speaker. Disconnect: it follows the system route.
- [ ] Settings > Diagnostics > Share log: look for `pace_beat` lines (field `driftMs` = play start minus scheduled time) and one `pace_segment` per set (mean, p95, max). Expected: median under about 30 ms, p95 under 60 ms on the handler path; Bluetooth adds a constant output latency that this number does not include. Note any `pace_clip_missing` (those beats played a tick earcon; no other voice is used).
- [ ] While a count plays, speech recognition is paused (log `stt_paused_for_tts`); say `멈춰` / `stop` between counts: pacing pauses. Say it exactly during a number: it may be missed (half-duplex gap rule, below). The on-screen Pause button always works.

**Voice changes during a session (ko and en)**
- [ ] `건너뛰어` / `skip this exercise`, `다섯 개 더` / `five more reps`, `한 세트 더` / `one more set`, `한 세트 줄여줘` / `one fewer set`, `휴식 20초로 바꿔줘` / `change the rest to 20 seconds`, `스쿼트 대신 런지` / `swap squats for lunges`, `느리게` / `slower`, `빠르게` / `faster` (tempo changes by about 15%), `다음 뭐야` / `what's next`, `얼마나 남았어` / `how many left`, `멈춰` then `다시 시작`, `운동 그만할래` / `end the routine early`. Each is answered in one short sentence and pacing continues from the right place.
- [ ] After a session with changes, the summary asks "Save changes to the template?" with "No" as the main button. Choose Save on a built-in routine: a copy named "(mine)" appears; the built-in is unchanged.

**Taegeuk 1**
- [ ] Start "Taegeuk 1" at Full: `하나, 왼발 앞서기 아래막기` ... movement 18 with a "기합!" reminder just before it. Switch to Short and Count only during the run (chips): the new level starts after a short preparation. Compare the order of stances, techniques and directions with your dojang's form; report any difference (the source list is in v1-spec section 2.4).
- [ ] `5번 동작부터 다시` / `repeat from movement 5` restarts at movement 5. `한 동작 뒤로` / `go back one move` goes back one. Slower/faster change the gap between counts.
- [ ] The screen shows the technique, count "5 / 18", facing, stance, the next movement, the speed percentage, and the live partial transcript.

**Correction notes**
- [ ] In practice say `오른손 먼저 나가야되는데 자꾸 왼손이 나가요` while on movement 5 (or right after it). Expect "5번 동작에 메모했어요". Run Taegeuk 1 again: "오른손 먼저!" plays just before the count of movement 5 at every pacing level, including Count only, without moving the beat.
- [ ] Say `아래막기 할 때 왼손이 나가요`: it asks you to pick the movement on screen (five low-block movements). Say `note: movement 12 I keep dropping my left hand` in English: attached to movement 12.
- [ ] Say `이제 괜찮아` / `mark as fixed` right after the cue played: the cue stops. The note remains in the editor (Notes) where it can be reopened, edited or deleted. The Journal has a user note with the routine and movement.
- [ ] The summary shows a line such as "오늘 5번 동작 오른손 먼저 큐 3번 나왔어요".

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

## One voice and earcons (added 2026-11-04, untested on a device)

Nothing here may play unless you tap it or a real cue is due. Use earbuds; the phone speaker is never forced.

- [ ] Settings > Alert tones: tap each tone chip once. Seven distinct short tones play on the earbuds (message coming, timer done, turn left falling, turn right rising, arrived, warning low and pulsed, thinking tick). The volume keys change their loudness; the Tone volume stepper changes them relative to speech. With vibration set to Always, the phone vibrates with each tone except the tick.
- [ ] Start a Work Partner session with Supertonic downloaded. No banner. Say "set a timer for 2 minutes called rice". Wait about 30 s, then check Diagnostics: `pace_prepare` shows the timer text synthesized (engine supertonic). When the timer ends, the phrase plays at once from cache (log `cue_clip`), with no earcon.
- [ ] Set a timer for 20 seconds and stop the session's clip cache first (Diagnostics > clear pacing cache) so nothing is ready: at the due time a timer tone plays, then the phrase is spoken in the **same voice** about 2 s later (`earcon_played`, `speech_late` with lateMs). The voice never changes.
- [ ] Same with a 1-minute pre-warning: if it is spoken more than 20 s late it is dropped (`speech_dropped_stale`), not said.
- [ ] Delete the Supertonic model (Settings > Voice), start a session: the session screen shows the notice that the phone voice is used for this whole session, and every phrase uses the phone voice. No tones are needed because the phone voice is fast.
- [ ] Travel Guide: fetch a route, wait a few seconds, walk (or replay a fix log). Turn cues play as composed fragments ("50미터 앞에서" + "우회전하세요"; `cue_clip` with composed=true). Force a miss by clearing the cache: a left or right turn tone plays first, then the cue only if you have not passed the turn.
- [ ] Routine: edit during practice ("note: ..."). The new cue text appears in the `pace_prepare` log before the next unit; a clip that cannot be made plays a tick, never a phone-voice count.
- [ ] Voice failure (cannot be forced from the UI; check the log after any engine error): expect `voice_engine_lost`, `voice_reload`, tones in the meantime, then either speech resumes in the same voice or the phone voice announces once "음성 엔진에 문제가 생겨서, 지금부터 목소리가 바뀌어요." and the banner changes (`voice_switched`).
- [ ] Grep the log for `tts_engine_fallback` and `pace_clip_fallback`: neither may appear any more.

## Known gaps to keep in mind while testing

- Routines: while a pacing clip plays, speech recognition is paused (half-duplex). If the gap between two clips is shorter than 700 ms, recognition stays paused across the gap, so "멈춰" is only heard in gaps of at least that length (typical for counts of 2 s or slower; at fast tempos use the Pause button). A "stop" partial transcript pauses immediately; the final transcript is not awaited.
- Routines: Bluetooth output latency (about 150-250 ms for A2DP) is a constant offset and not part of the logged drift.

- Speech-mode transcript and word timestamps are not passed to Voice Coach: the platform recognizer is paused during a take and gives no word timestamps anyway.
- Timers started by voice in Travel Guide or Voice Coach are announced by a JS tick, not by the native cue scheduler; if the OS freezes JS in the background they may be late (Work Partner uses native cues).
- If session STT has fallen back to sherpa capture, it is not paused during takes (only the platform recognizer is).
- The walk log lives in memory until the session ends; a killed app loses the unsaved part of that walk.
- The last-used language for Auto mode is kept in memory only.
