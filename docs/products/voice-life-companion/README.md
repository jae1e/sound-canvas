# Voice Life Companion

Product and conversation handoff — November 3, 2026

Status: the user has selected a personal-use product direction and explicitly wants all three modes in the first implementation. No application has been implemented as part of this documentation task.

## Read This First

This document is the product brief. Read [implementation-handoff.md](implementation-handoff.md) for behavior, state, architecture, and acceptance criteria, [earbud-compatibility.md](earbud-compatibility.md) for device research and launch/control constraints, and [technical-decisions.md](technical-decisions.md) for the proposed stack (Android first with iPhone later, Expo/React Native with TypeScript, on-device-first speech, tiered LLM routing, Korea walking routing).

The repository remains a workspace for multiple market studies. This product direction applies to Voice Life Companion; it does not invalidate unrelated research or authorize replacing other agents' work.

### Scope Clarification

The three modes are:

1. **GPS walking and navigation companion.**
2. **Conversational activity companion**, initially supporting cooking and workout workflows through shared steps, timers, check-ins, and completion reports.
3. **Vocal and voice-practice companion.**

**Voice journaling and persistent memory span all three modes.** Journaling is also available directly, without requiring a planned activity.

The assistant previously recommended completing vocal practice first and adding the other modes later. The user explicitly superseded that recommendation: **implement all three together**. Shared infrastructure can be built first, but the first product must contain functional experiences in all three modes. A vocal-only release with placeholder walking/activity screens does not meet the request.

## 1. User Decisions and Product Principles

| ID | Decision | Status |
| --- | --- | --- |
| D01 | Build Voice Life Companion with all three modes in the first implementation | Explicit user instruction |
| D02 | Prioritize something the user will personally use over selecting a market first | Explicit user preference |
| D03 | Convenience is the primary product principle | Explicit user preference carried from earlier research |
| D04 | Assume headphones during activities, or a nearby phone in a quiet environment | Explicit user assumption |
| D05 | Use phone GPS and optionally external devices where useful | Explicit user permission; integrations not yet selected |
| D06 | Support proactive elapsed-time nudges, remaining-time announcements, and requests to check real progress | Explicit user examples |
| D07 | Start the learning/practice experience with vocal and voice practice | Explicit user interest |
| D08 | Let voice journaling emerge naturally from activities and conversation | Explicit user interest |
| D09 | Preserve direct human editing alongside agent-driven changes | Persistent user requirement |
| D10 | Include AirPods, Galaxy Buds, inexpensive QCY-style earbuds, and sports headphones in compatibility research | Explicit user request |
| D11 | Keep development and operating costs appropriate for a small software company | Persistent user constraint |
| D12 | Write repository documentation in English; conversation language may vary | Explicit repository rule |

The user's development phone, OS, headphone models, preferred technology stack, and AI providers are **not confirmed**. Do not infer an Android or iPhone development target from the Linux workstation used during the conversation.

## 2. How the Direction Evolved

- Research began with DAWs, AI-generated music, sound effects, speech, and agents operating editable tools. Background is in [the music and audio study](../../market-studies/music-audio.md).
- The user wanted self-service adoption and a product people could use individually before introducing it to an organization.
- Exploration expanded to video, reports, diagrams, and other editable agent workflows. Convenience became the overriding principle.
- A colleague's voice-based workout logging app prompted interest in headphones as a hands-free interface. A trainer suggested exercise-specific spoken reminders.
- Two families emerged: activity pacing/progress support, and audio-based learning/practice.
- GPS-assisted walking/travel, voice checklists, and interview/exam simulation were explored. Assembly guides faced an unresolved willingness-to-pay question relative to videos. Frontline reporting has existing competitors and organizational adoption requirements.
- The user then shifted the immediate objective to personal use. They do not travel or cook frequently, but want GPS-assisted everyday walking/navigation and expect to use vocal practice. Cooking/workout examples remain in scope as activity workflows.
- The user chose the broader Voice Life Companion direction and requested simultaneous implementation of all three modes.

This is a personal-use prototype direction, not a validated commercial positioning. Pricing, acquisition, and a final business model remain open. General job-seeker video resumes were excluded in prior video research; later interest in interview/exam practice was a separate concept and is not a required mode here.

## 3. Core Experience

The primary unit is an **explicitly started session**:

> State an intention → agree on a short plan → act → receive timely assistance → report or revise progress → reflect → resume with useful context next time.

Examples:

- "Let's walk to the library. Keep the guidance brief."
- "I'm cooking pasta and mushrooms. Keep track of both."
- "Start my workout routine. Remind me of my saved cues before each exercise."
- "Let's practice this chorus for fifteen minutes."
- "Save a journal note about what I just noticed."

The app should remember progress, accept short corrections, and speak when there is a reason to intervene. It should also let the user remain silent, pause speech, or choose a quieter mode.

The first experience is a user-started session. Device-wide always-on wake-word detection and automatic launch whenever earbuds connect have not been established as requirements or platform capabilities.

## 4. Mode A: GPS Walking and Navigation Companion

### Intended Use

Everyday walks and practical walking directions that the user can test near home. International travel and mountain hiking are future contexts; neither is necessary to validate the initial experience.

### Initial Functional Scope

- Select a supported destination or saved walking route and inspect it before starting.
- Follow a real route with current location, progress, and upcoming instructions.
- Hear concise guidance through headphones and ask about remaining route distance or estimated time.
- Change how much the companion speaks.
- Pause/resume the session and record observations without losing navigation context.
- Request a route change; preview or confirm the changed plan before adopting it.
- Save the route/session and associated journal entries for later review.
- Detect stale or inaccurate fixes and describe uncertainty rather than invent precise positioning.

A route import can be one input path, but location tracking alone is not a complete navigation companion. A functional route-following experience is required. Supported destination lookup, routing, route recalculation, and offline behavior depend on the selected provider and must be explicitly documented.

### Example

1. User selects a destination or saved neighborhood route.
2. The app presents the route and starts a walking session.
3. The app gives an instruction at an appropriate route point.
4. User asks, "How much farther?"
5. User says, "Journal note: I want to return to this place."
6. The app saves the note, with location if enabled, and continues navigation.
7. The user reviews the walk and edits the note afterward.

GPS reception, internet connectivity, map availability, and route computation are separate concerns. Weak reception can occur in mountains and near buildings. Do not treat a cached map as proof that rerouting or fresh place information works offline.

## 5. Mode B: Conversational Activity Companion

### Intended Use

Cooking and workout sessions share a progress engine: named activities, steps, timers, check-ins, completion reports, notes, and plan changes. Both should have usable example flows in the initial product.

### Initial Functional Scope

- Create or edit a plan by voice or direct UI controls.
- Run multiple named tasks concurrently, such as two dishes.
- Track elapsed time and remaining time for each relevant task.
- Speak at requested milestones, including "three minutes have elapsed" and "one minute remains."
- Ask the user to inspect or report progress.
- Interpret "done," "not yet," "two more minutes," "skip this," and corrections in context.
- Ask a short clarification when the intended task is ambiguous.
- Cancel or replace obsolete reminders after a change.
- Save plans as reusable templates and preserve session-specific changes separately.

### Cooking Example

> User: "The pasta is cooking, and I've started the mushrooms. Check on the mushrooms in three minutes."
>
> App: "Both are tracked. I'll ask about the mushrooms in three minutes."
>
> App: "Three minutes have passed. Please check the mushrooms and tell me whether they're done."
>
> User: "Not yet. Two more minutes."
>
> App: "I'll check again in two minutes. The pasta has one minute left on its timer."
>
> User: "The mushrooms are done."
>
> App: "Marked done and cancelled the mushroom check-in."

The app knows elapsed time. It knows actual completion only from an appropriate observation or user report. No reply means **awaiting confirmation**, not completed.

### Workout Example

- The user creates a routine or imports their own trainer notes.
- Before an exercise, the app reads a saved personal cue.
- The user reports a set, repetitions, and weight by voice.
- The app starts or updates the requested rest timer.
- The user corrects a misheard value without restarting the session.
- The session ends with a reviewable log and reflection.

Automatic repetition counting, full-body posture recognition, and physiological coaching are separate integrations or analysis capabilities. A saved reminder is not evidence that the app observed a form error.

## 6. Mode C: Vocal and Voice-Practice Companion

### Intended Use

The user expects to use vocal/voice practice personally. The first version should assist an actual practice session rather than only provide a generic conversational tutor.

### Initial Functional Scope

- Create, select, and directly edit a practice routine.
- Set a total duration and named practice blocks.
- Manage practice/rest transitions, repetition, and remaining-time nudges.
- Record explicitly selected practice takes and play them back.
- Attach notes to a take or practice block.
- Repeat a block and compare recordings through a simple review interface.
- Capture a short end-of-session reflection.
- Start a later session with the previous user-approved notes available.

Reference audio and repeatable sections are useful extensions of this initial flow. Basic pitch/rhythm analysis is a candidate enhancement, not a confirmed requirement for simultaneous delivery of the three modes. Detailed automatic vocal-technique assessment has not been validated or promised.

### Example

1. User says, "Let's practice the chorus for fifteen minutes."
2. The app confirms the available routine, blocks, and recording choices.
3. The user starts a take and then asks to hear it again.
4. User says, "I lost the rhythm in the second phrase. Save that."
5. The app attaches the note to the take and offers to repeat the block.
6. User ends the session and gives a short reflection.
7. Next time, the app can ask whether to revisit the previously marked phrase.

Feedback should occur before a block, at a useful boundary, or after a take. Elapsed time does not prove that a sung phrase has ended. Avoid interrupting an active take for routine commentary.

## 7. Journaling, Memory, and Direct Editing

Journaling is both a cross-mode feature and a standalone entry point.

- Accept a brief voice note without requiring the user to end an activity.
- Keep it associated with the relevant session, task, take, and optional location.
- Distinguish user observations from inferred interpretations and generated summaries.
- Make transcripts, summaries, next-session notes, and reusable templates directly editable.
- Preserve original material according to the user's recording choices.
- Let the user correct a recognition error or remove an entry.
- Use approved, relevant memory in the next session; do not repeat a long history at startup.
- Allow review/export in an inspectable format. The exact export format is an implementation choice.

For example, "The high notes felt difficult today" is the user's report. It does not establish a physiological cause. Likewise, a voice report that a task is complete is a user-reported completion, not an independently verified inspection.

## 8. Interface and Interaction

Recommended UI structure, not an approved visual design:

- A clear session entry point for walking, activity, or vocal practice, plus quick journaling.
- An active-session screen showing current state, relevant tasks, timers, microphone state, and the next planned intervention.
- Large direct controls for correction, quiet mode, timer changes, and ending/resuming a session.
- An editable plan and session history.
- Audio-device status, including the actual input and output routes.

Short voice requests must work during a started session. The UI is the recovery path when recognition is wrong or the user prefers editing directly. Do not require a long setup conversation for a reusable session.

Conversation may be in Korean or another user-selected language. The repository's English-documentation rule does not make an English-only application a user requirement. Test Korean time expressions, task names, and correction phrases if Korean is selected for the prototype.

## 9. Headphones and Mobile Assumptions

The app runs on the phone. Consumer earbuds generally provide audio and control inputs rather than a runtime for installing this app.

Required compatibility research covers premium, inexpensive, and sports models. Basic audio, assistant-based app launch, in-session button events, custom wake words, and locked-phone operation are distinct capabilities. Read [earbud-compatibility.md](earbud-compatibility.md) before promising any of them.

Actual phone/OS/headphone combinations need testing. A successful desktop demo or manufacturer feature description is not proof of hands-free mobile operation.

## 10. Scope Boundaries and Open Decisions

### Required for the First Product

- Functional experiences in all three modes.
- Shared voice interaction, explicit state, timers/check-ins, correction, persistence, and journaling.
- Direct editing of the same underlying state that the agent modifies.
- Real-device evaluation of audio routing, interruptions, and background behavior on the selected platform.

### Follow-On Candidates

- Advanced pitch/rhythm/vocal analysis.
- Automatic exercise recognition and posture analysis.
- External sensor integrations.
- Rich travel narration, discovery, and route content.
- Interview/exam simulations, professional field reporting, and team administration.
- Wearable-specific motion controls.

These candidates do not replace any of the three required modes.

### Decisions Still Needed

1. The user's actual phone OS and physical test devices.
2. Initial platform coverage and native/cross-platform approach.
3. Speech recognition, voice output, and language support.
4. Walking route/place provider, geographic coverage, and data rights.
5. Local/cloud storage and recording-retention defaults.
6. Exact launch/shortcut behavior supported on target devices.
7. Which optional analysis features, if any, accompany the initial vocal experience.

Resolve implementation choices from available project context when possible. Ask the user for facts only they can supply when needed. Do not silently turn an unresolved choice into a product promise.

## 11. Success and Commercial Status

The primary early test is whether the user repeatedly starts these sessions, touches the phone less during activities, trusts the reminders, and finds the saved context useful next time.

Track active effort, missed/duplicate nudges, recognition corrections, interrupted takes, completed sessions, repeat usage, battery impact, and provider costs. No numerical target, conversion rate, pricing, or product-market fit has been established.

Commercial research remains useful background, but market optimization is no longer the gate for building a personal-use prototype.

## 12. References and Prior Evidence

Sources below were reviewed in the preceding conversation through November 3, 2026. They are context and implementation references, not compatibility certification. Recheck time-sensitive behavior before relying on it.

- [Carv coaching](https://getcarv.com/coaching): adjustable timing and intensity of sensor-driven audio coaching.
- [VoiceMap playback](https://support.voicemap.me/how-does-a-voicemap-tour-work/): GPS-triggered audio and downloadable tours.
- [goumi](https://goumi.ai/): conversational cooking steps and timers.
- [Motra getting started](https://help.motra.com/en/articles/9980535-getting-started-with-motra): watch-based exercise detection with confirmation/editing.
- [June by Yousician](https://apps.apple.com/us/app/ai-guitar-lessons-teacher/id1640426327): conversational instrument-practice tooling.
- [Speak AI Tutor Call](https://www.speak.com/blog/your-tutor-is-one-call-away-introducing-ai-tutor-call): persistent conversational practice.
- [Speak architecture](https://www.speak.com/blog/the-architecture-behind-ai-tutor-call): separating listening, assessment, speech, and application side effects.
- [GPS accuracy](https://www.gps.gov/gps-accuracy-0): environmental limitations of location fixes.
- [Apple local notifications](https://developer.apple.com/documentation/UserNotifications/scheduling-a-notification-locally-from-your-app): time/location triggers and delivery behavior.
- [Android alarm scheduling](https://developer.android.com/develop/background-work/services/alarms): timing and background execution considerations.
