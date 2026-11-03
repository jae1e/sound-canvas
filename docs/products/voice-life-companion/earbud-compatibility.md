# Earbud Compatibility and Hands-Free Launch

Research date: November 3, 2026  
Scope: AirPods, Galaxy Buds, inexpensive QCY-class earbuds, and sports headphones for [Voice Life Companion](README.md)

## 1. Answer to the User's Question

Consumer Bluetooth earbuds can be useful input/output devices for a phone-based app. The app runs on the phone, not on the earbuds.

Several manufacturers document a gesture that invokes the phone's voice assistant. That creates a possible route to opening our app or running an exposed app action. It does **not** establish that an arbitrary gesture can directly launch our app, that a custom session can always start with the screen locked, or that a connected headset microphone is automatically selected.

Follow-up clarification: the user specifically asked to launch the app directly without talking to another assistant. On Android, investigate making our app the user-selected assistant handler, so a compatible headset's assistant gesture enters our app directly. This uses an OS role and does not require a conversation with Gemini/Bixby. It replaces the selected assistant entry point and is device-dependent. On iOS, investigate Bluetooth-connection automation as a separate path; it is not arbitrary AirPods-button remapping.

No physical compatibility tests were conducted. The findings below are documentation-level evidence and a test plan, not a certified supported-device list.

## 2. Distinct Capabilities

| Capability | Meaning | Engineering implication |
| --- | --- | --- |
| Audio playback | Spoken guidance reaches the headphones | Use and verify OS audio routing |
| Microphone capture | Our app receives the headset microphone | Verify the actual input route and supported recording mode |
| Assistant invocation | Gesture or supported wake phrase invokes Siri/Bixby/Gemini/etc. | Depends on headset, phone, settings, assistant, language, and firmware |
| App launch | The phone's assistant opens our installed app | Test recognition of the app name and lock/authentication behavior |
| Direct Android handler invocation | A compatible headset's assistant gesture is routed to our user-selected handler | Implement the appropriate assistant role/entry point; verify OEM and firmware routing |
| Session action | Assistant runs a specific app action with parameters | Requires platform integration; separate from just opening the app |
| In-session media controls | Play/pause/next commands reach the active media session | Use supported media APIs and maintain clear semantics |
| Device-wide custom wake word | Our own phrase starts our app at any time | Not established by this research |
| Connect-to-start automation | Connecting earbuds triggers an app action/launch attempt | Apple documents Bluetooth automation triggers; foreground opening, lock state, and recording remain action-specific |
| Headphone motion sensing | App receives supported head-motion data | Optional device-specific integration, not generic Bluetooth audio |

An earbud tap handled by firmware or the phone's assistant is not necessarily delivered to our application as a raw gesture. Do not promise universal double-tap-to-start behavior.

## 3. Representative Device Findings

| Device/category | Documented evidence | Implication and limits |
| --- | --- | --- |
| AirPods with a compatible Apple device | Apple documents voice/touch invocation of Siri. App Shortcuts expose app actions to Siri | Strong integration path to investigate. App action, microphone access, locked-phone behavior, and exact model controls still need testing |
| Galaxy Buds, including Buds3-series guidance | Samsung documents assigning a pinch/hold action to the phone's digital assistant. Samsung also describes Gemini interaction on compatible Galaxy devices | Good Android/Galaxy test category. Do not generalize every feature to every Buds model or iPhone pairing |
| QCY T13, inexpensive earbuds | Global product page documents calling/microphones. A QCY-branded regional support page describes triple-touching the left earbud to invoke the voice assistant | Evidence that an expensive headset is not required for assistant invocation. Regional support is not a global firmware guarantee; verify the exact unit and controls |
| Shokz OpenRun Pro 2, sports/open-ear | Manufacturer support lists holding the multifunction button for two seconds on standby to prompt the device's assistant | Relevant walking/workout test category. Standby behavior is documented; music-playing and locked-phone combinations require testing |
| Soundcore Sport X20, sports/ear-hook | Manufacturer FAQ says a button action can be assigned to Voice Assistant in the soundcore app; single press cannot be assigned to it | Relevant physical-button option. Verify mapping, assistant handoff, and audio coexistence on the selected phone |
| JBL Endurance Race 2, sports earbuds | Manufacturer page documents Bluetooth and microphones; it provides a model-specific quick-start guide | Audio category to consider. Exact assistant gestures were not verified in this study; do not infer them from the earlier Endurance Race model |

These are research examples, not purchase recommendations or a claim that every listed model currently has identical regional availability. Prices were not compared. Do not inherit a gesture from T13 to T13 ANC, T13 ANC 2, or another QCY model without checking its manual. Apply the same rule to other product families.

## 4. Proposed Launch and Control Strategy

### Baseline

Support an explicit start from our app, then hands-free conversation during a supported active session. Keep direct UI controls and an appropriate notification/lock-screen entry path as fallbacks.

### Apple Integration Candidate

Expose meaningful actions through App Intents/App Shortcuts, for example start a saved practice routine or create a journal entry. Users can invoke Siri through supported AirPods controls and then request the action.

This is a proposed implementation path. Whether the action can run in the background or must bring the app forward depends on its behavior and platform rules. A successful Siri action invocation does not prove that recording can start while locked.

### Android Integration Candidate

Use an installed app entry point and supported deep links/shortcuts. Test opening the app through the phone's configured assistant. A direct phrase for a specific session depends on that assistant's actual third-party integration and must be demonstrated rather than assumed.

**Direct-entry option:** Android exposes a user-selectable assistant role and voice-interaction integration. Build an eligible handler and let the user explicitly select it. If a headset routes its assistant gesture through this system entry point, pressing it could enter Voice Life Companion immediately, without opening another assistant or asking it to launch us. This is a candidate implementation, not a verified QCY/Buds/Shokz compatibility claim. Test invocation, session initialization, visible UI, microphone permission, and locked operation separately.

Key Mapper provides a useful independent feasibility tool: its own documentation supports assistant triggers on Bluetooth headsets, but warns that some headsets hardcode specific assistants. It can help test routing on the user's phone before implementing our handler. It is not a mandatory product dependency, and generic media-button remapping is not universally supported.

For a running media experience, Media3 sessions support controls from headphones and system UI. The OS chooses where media commands go. If music is playing in another app, our app may not own those events. Do not use media-button capture as a universal app launcher or silently steal another player's controls.

### Connection Automation and Vendor Shortcuts

Apple documents personal automations triggered when a selected Bluetooth device connects, including automatic execution options on supported OS versions. A user can configure an app-opening or exposed app-action workflow without speaking to Siri. Connection is the trigger, not an arbitrary earbud press; unlocking or other interaction can still be required for a particular action.

Apple's documented AirPods gesture settings do not expose a general-purpose arbitrary-app selector. Samsung's documented supported touch actions include selected integrations such as Spotify; that is not evidence that any third-party app can be assigned. Keep vendor integrations separate from a general app-launch API.

### Optional Headphone Motion

Apple provides `CMHeadphoneMotionManager` for supported headphones and requires a capability check. A nod/shake interaction would still need interpretation, calibration, and false-trigger testing. Head motion does not reveal full-body form, and this feature must not become a requirement for inexpensive headphones.

## 5. Audio Capture Requirements

- Log the actual input/output route, available sample format, and route changes in diagnostics.
- Confirm that headset audio output is not being mistaken for headset microphone input.
- Test simultaneous listening/speaking, reference playback, and music separately.
- Audio profiles and quality can change when a Bluetooth microphone is engaged; inspect actual behavior instead of assuming playback quality applies to capture.
- Evaluate speech recognition with the headset mic and with the phone mic. Vocal/music capture may need a different route and processing configuration from conversation.
- Handle a phone assistant temporarily taking the audio session; avoid recording assistant speech as the user's commands.
- Track incoming calls, disconnect/reconnect, one-earbud use, and multipoint switching where supported.
- Distinguish audible output success from semantic action success. Saying "saved" must correspond to a saved application record.

## 6. Physical Test Matrix

Cover the user's existing devices first. Additional coverage should include one inexpensive headset and one sports/open-ear model if available; hardware purchase has not been requested or performed.

For each phone/OS/headset combination, record:

- Exact phone model, OS/build, headset model/firmware, assistant, app build, and language.
- Permissions and manufacturer-app gesture mappings.
- Input/output route in practice, including when the screen is locked.
- Whether the app is foregrounded, backgrounded, terminated normally, or force-stopped.

| Test | What to verify |
| --- | --- |
| Start from app UI | Capture/output and state initialization |
| Invoke phone assistant from earbuds | Exact gesture and whether it works on standby and during music |
| Ask assistant to open our app | Cold/warm start and whether unlocking is required |
| Invoke our Android assistant handler directly | User-selected handler receives the headset gesture; no other assistant conversation; test cold/warm/locked cases |
| Bluetooth connection automation | Trigger delivery versus app opening/session start/recording; locked/unlocked and duplicate-connection cases |
| Run a session shortcut | Actual parameters, foreground transition, permissions, and duplicate prevention |
| Lock during an active session | Listening, spoken nudges, location updates, and recovery |
| Play external music | Mixing/ducking and who receives headset media buttons |
| Pause/resume or replay using buttons | Only the advertised semantic operation occurs |
| Receive a call or invoke assistant | Audio focus, session interruption, and restoration |
| Disconnect/reconnect or switch devices | No false confirmation, missed accepted records, or duplicated cues |
| Record vocal practice | Voice/music quality and reference-playback interference |
| Walk outdoors | Wind/noise, phone placement, and route accuracy |

Record outcomes as `documented`, `tested working`, `tested with limitations`, `unsupported`, or `unknown`. Keep documentation evidence distinct from a physical test result. Define a measured supported matrix before advertising compatibility.

## 7. Sources and Evidence Notes

Reviewed on November 3, 2026. Official technical/manufacturer sources were preferred. Dynamic pages may expose more detail through indexed text than their rendered page; confirm gestures against the exact device/manual during testing.

1. [Apple: Use Siri with AirPods](https://support.apple.com/en-ie/guide/airpods/devc2c0f438a/27/web/27) — model-specific assistant activation; direct retrieval was rate-limited in one attempt.
2. [Apple: App Shortcuts](https://developer.apple.com/documentation/appintents/app-shortcuts) — expose app actions and preconfigured parameters through system experiences.
3. [Apple: MPRemoteCommandCenter](https://developer.apple.com/documentation/mediaplayer/mpremotecommandcenter) — external accessory/system playback events, not arbitrary raw gesture access.
4. [Apple: CMHeadphoneMotionManager](https://developer.apple.com/documentation/coremotion/cmheadphonemotionmanager) — supported headphone motion updates and availability checks.
5. [Samsung: Galaxy earbuds assistant controls](https://www.samsung.com/us/support/answer/ANS10001317/) — phone assistant invocation, including Buds3-series pinch/hold setup.
6. [Samsung: Gemini on Watch and Buds](https://news.samsung.com/global/smarter-wearables-google-gemini-is-coming-to-samsung-galaxy-watch-and-buds) — compatible Galaxy ecosystem assistant interaction.
7. [QCY global T13 product](https://www.qcy.com/products/qcy-t13-wireless-earphones) — audio/calling hardware description.
8. [QCY India T13 FAQ](https://www.qcy-india.com/copy-of-qcy-t17-faqs) — regional QCY-branded support, not independent physical testing or a global firmware guarantee.
9. [Shokz product help](https://help.shokz.com/s/product-detail?Id=a174x000006OuLYAA0) — indexed manufacturer help describes model-specific assistant activation; live page is dynamically rendered.
10. [Shokz Australia button-control help](https://help.shokz.com.au/s/article/About-Button-C1ontrol) — multifunction-button assistant command; verify applicable model.
11. [Soundcore Sport X20 manufacturer FAQ](https://www.soundcore.com/products/a3968-sport-x20-earbuds?variant=43988210483390) — configurable Voice Assistant button action and single-press restriction.
12. [JBL Endurance Race 2](https://www.jbl.com/ENDURANCE-RACE-2.html) — audio/microphones and access to model-specific documentation.
13. [Android: Media3 session controls](https://developer.android.com/media/media3/session/control-playback) — headset/system controls and foreground-service requirements for background media playback.
14. [Android: microphone/foreground-service restrictions](https://developer.android.com/develop/background-work/services/fgs/restrictions-bg-start) — background microphone start constraints.
15. [Apple: Bluetooth high-quality recording](https://developer.apple.com/documentation/avfoundation/avcapturesession/configuresapplicationaudiosessionforbluetoothhighqualityrecording) — an example of device/API-specific capture capability; not a guarantee for generic earbuds.
16. [Android: RoleManager](https://developer.android.com/reference/android/app/role/RoleManager#ROLE_ASSISTANT) and [VoiceInteractionService](https://developer.android.com/reference/android/service/voice/VoiceInteractionService) — platform assistant integration, not a universal headset-routing guarantee.
17. [Key Mapper: assistant triggers](https://keymapper.app/user-guide/keymaps/) and [Bluetooth troubleshooting](https://keymapper.app/faq/) — developer documentation for headset triggers and hardcoded-assistant limitations.
18. [Apple: Bluetooth automation triggers](https://support.apple.com/en-gb/guide/shortcuts/apde31e9638b/9.0/ios/26) and [automatic execution](https://support.apple.com/en-euro/guide/shortcuts/apdfbdbd7123/10.0/ios/27) — per-OS connection-triggered automation; actions still require testing.
19. [Apple: AirPods gesture settings](https://support.apple.com/en-us/108764) and [Samsung: supported touch commands](https://www.samsung.com/us/support/answer/ANS10001318/) — documented gesture choices and selected vendor integrations.
