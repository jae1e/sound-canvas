# Implementation Handoff

Updated: November 3, 2026  
Authority: [product brief](README.md)  
Status: proposed engineering design and acceptance criteria; application implementation has not started in this handoff

## 1. Delivery Contract

Build a usable Voice Life Companion with all three modes in the same initial product:

- GPS walking/navigation.
- Activity sessions with cooking and workout flows.
- Vocal/voice-practice sessions.

Journaling, persistent context, and manual editing are shared features. Work can be sequenced by dependency, but do not remove modes or turn them into placeholders to finish a single vertical first.

The conceptual types and operations below are suggestions for a clear implementation. They do not prescribe a framework, database, cloud vendor, or model provider.

## 2. Separate Interpretation from Application State

Use the following responsibility split:

1. **Audio and observation adapters:** capture speech, audio-device state, location fixes, recording boundaries, and supported button events.
2. **Interpretation:** map user requests to structured candidate actions; ask for missing information when needed.
3. **Session engine:** validate actions and update authoritative state.
4. **Scheduler:** compute due events from actual clocks and current state.
5. **Speech coordinator:** decide what to say now, queue/defer relevant messages, and handle interruption.
6. **Persistence and journal:** retain structured state, source material, corrections, and summaries.
7. **UI:** read and modify the same state using the same validated operations.

An LLM can propose a timer change or completion action. The application commits it, schedules it, and acknowledges the committed result. Model memory or a transcript must not be the sole source of truth for timers, route position, or task completion.

## 3. Shared Data Model

| Entity | Suggested fields and purpose |
| --- | --- |
| Session | ID, mode, status, plan revision, start/end times, preferences, linked tasks/route/practice blocks |
| PlanTemplate | Reusable editable definition, version, steps, cues, default timer policies |
| Task | ID, label, status, prerequisites, progress source, last confirmation, related timers |
| Timer | ID, task ID, duration/deadline, clock policy, state, milestones, revision |
| CheckIn | Question, target task, due condition, response status, follow-up policy |
| Cue | Content, trigger, priority, expiry, repeat limit, acknowledgement state |
| Observation | Source, observed time, received time, confidence/accuracy, associated entity |
| Recording | Session/block/take IDs, asset reference, duration, capture route, timestamps |
| JournalEntry | Source utterance/recording, editable text, associations, optional location, provenance |
| Memory | User-approved preference or takeaway, scope, source, modification history |
| Action/Event | ID, source, target, expected revision, result, timestamps, deduplication key |

Keep plans/templates separate from individual executions. A one-off change during a session should not silently alter a reusable routine. Let the user explicitly save it as the new default.

Distinguish measured facts, estimates, user reports, and generated interpretation. Preserve the source of a completion report and the basis of a route estimate.

## 4. State and Action Semantics

Suggested session states: `draft`, `ready`, `active`, `paused`, `ended`. Recovery after an interruption is a separate condition, not evidence that the activity completed.

Suggested task states: `pending`, `in_progress`, `awaiting_confirmation`, `completed`, `skipped`, `cancelled`.

Representative operations:

- Create/start/update/pause/resume/end a session.
- Add/start/complete/skip/reopen a task.
- Start/extend/pause/resume/cancel a timer.
- Schedule/acknowledge/reschedule/cancel a check-in.
- Record a workout set and correct a recorded value.
- Start/stop/play a recording and mark a practice section.
- Select/start/change a route and read navigation status.
- Add/edit/delete a journal entry or next-session note.
- Change spoken-feedback preferences.

Validate units, ranges, target entity, current state, and expected revision. Apply duplicate requests idempotently when possible. A late agent action must not overwrite a newer manual edit.

If two cooking tasks are active and the user says "done," resolve from reliable context or ask which task. Do not arbitrarily mark both complete.

After a successful action, the spoken acknowledgement should describe what actually changed. If scheduling or persistence failed, do not say the reminder is set or the note is saved.

## 5. Timers, Nudges, and Check-Ins

### Time Is Not Completion

At a deadline, a timer may expire and a check-in may become due. The physical task can remain `in_progress` or `awaiting_confirmation` until the user reports its state.

Example: three minutes elapsed → ask whether the mushrooms are done → user requests two more minutes → replace the check-in → completion report cancels obsolete reminders.

### Distinguish Pause Operations

| User intent | Expected behavior |
| --- | --- |
| Quiet/mute speech | Reduce or suspend spoken output; preserve task/timer state |
| Pause a practice block | Freeze that block's active-time clock and stop relevant recording/playback safely |
| Pause the conversation during cooking | Continue wall-clock cooking timers unless the user also pauses them |
| Pause a specific timer | Pause that timer only |
| End a session with pending tasks | Resolve pending reminders explicitly; do not leave surprising stale alerts |

Model each timer's clock policy explicitly. Physical cooking continues while an app is quiet or a phone screen is off. A suspended practice block may use an active-time clock. A workout rest timer may continue while conversation is paused.

### Scheduling Requirements

- Use real elapsed-time/deadline calculations, not model-generated estimates of passing time.
- Define milestones such as three minutes elapsed or one minute remaining.
- Persist enough state to recover after background suspension or process restart.
- Use a monotonic clock for in-process elapsed intervals where appropriate, and define reconstruction after restart, reboot, or wall-clock changes.
- On edits, cancel/update old OS notifications and internal queued cues.
- Before delivery, revalidate the event against current state and revision.
- Bound repeat check-ins. A silent user is not a request for unlimited interruptions.
- Distinguish scheduled, queued, delivered, expired, acknowledged, and cancelled events.
- On recovery, avoid playing a backlog of stale messages as though they were current.

Lock-screen notifications are a fallback mechanism, not proof that arbitrary speech can start and the microphone can reopen after the OS terminates the app.

## 6. Speech and Audio Behavior

- Show the actual microphone and output route; do not infer the input from the presence of connected earbuds.
- Test conversational speech capture separately from musical/vocal recording.
- Treat the app's own speech and reference playback as possible interference with recognition. Prevent feedback loops and accidental commands from its own output.
- Support interruption of spoken responses during an active session, within the selected platform's supported behavior.
- Use short confirmations for routine actions and clarification for ambiguous requests.
- During a selected practice take, suppress ordinary coaching interruptions until a useful boundary. Explicit user requests can interrupt it.
- Give route instructions and time-sensitive cues appropriate priority without stacking unrelated speech over them.
- Preserve sensible volume/audio-focus behavior when mixing or ducking other audio. Test music coexistence; do not assume it works automatically.
- Manage calls, assistant invocations, headset disconnection, and input/output route changes as explicit events.
- Make microphone, recording, muted, interrupted, and unavailable states visible and understandable.

Metronomes, backing-track timing, and clip playback belong in an audio engine. A network conversation loop is not an appropriate clock for musical timing.

## 7. Mode Adapters

### Walking/Navigation

- Use a real route/place provider or supported imported route representation.
- Keep route geometry, instructions, progress, and estimates in application state.
- Represent each location fix with measurement time and horizontal accuracy where available.
- Evaluate freshness and accuracy before generating location-specific statements.
- Handle off-route conditions without inventing a route. Any recalculated route comes from a supported routing process.
- Define rerouting and offline capabilities explicitly for the chosen integration.
- Keep navigation context when a journal note or conversation temporarily takes focus.
- Cache permitted information according to provider terms; do not assume offline map/routing rights.
- Define background location updates and permission behavior on the target phone.

### Cooking and Workouts

- Reuse the task/timer/check-in engine.
- Support named parallel dishes and independent timer changes.
- Support workout exercises, sets, repetitions, optional weight/units, rest intervals, and saved cues.
- Separate personal reminders from sensor-detected feedback.
- Save corrected logs without duplicating an earlier misheard entry.

### Vocal Practice

- Support an editable routine with named blocks, duration, repetitions, and rest.
- Record/play back identifiable takes associated with a block.
- Preserve take notes and the user's own assessment.
- Provide a practical repeat/review flow.
- Keep optional signal analysis separate from narrative coaching. If pitch/rhythm analysis is added, evaluate it on appropriate reference examples and report uncertainty.

## 8. Journal and Memory Rules

- A quick note should not reset the main session or erase its pending events.
- Store transcript corrections without losing the association to source recordings, when retained.
- Keep original observations separate from an editable generated summary.
- Do not infer medical/physiological explanations or observed physical outcomes from subjective notes.
- Use memory by relevant session/task scope; avoid injecting the entire journal into every model request.
- Provide deletion and inspectable export for the user's own records.
- Establish explicit recording/retention defaults before implementation. Do not assume continuous all-day recording is part of this request.

## 9. Mobile and Provider Decisions

The user has not specified the phone OS. Establish the available physical device before committing to platform-specific APIs. Platform-independent state and scheduling work can proceed independently.

Choose a native or cross-platform approach based on reliable microphone, background audio, recording, location, and shortcut support. A browser prototype can validate dialogue and UI, but cannot by itself validate the intended locked-phone mobile experience.

Expose useful functions as ordinary application operations first. MCP was an earlier research interest, but an MCP server is not a prerequisite for the consumer mobile prototype.

Use narrow adapters for ASR, reasoning, voice output, route/place data, and persistence. Record model/provider versions and failures. Keep credentials out of client bundles when required by the provider's security model.

Measure connection duration, active speech, output duration, calls per session, retries, location update frequency, battery use, and recording storage. Do not assume a provider bills only voiced seconds. Local timing and cached routine cues can reduce dependence on continuously connected generation.

## 10. Acceptance Scenarios

These are proposed completion criteria for implementation, not tests already executed.

| ID | Scenario | Required result |
| --- | --- | --- |
| C01 | Create and edit a session by UI and voice | Both modify the same authoritative state |
| C02 | Correct a value after an agent request is in flight | The stale request does not overwrite the correction |
| C03 | Interrupt/restart the app | Recoverable state is offered; no invented completion |
| A01 | Start two named cooking tasks | Independent status and timers are visible |
| A02 | Reach three-minute/one-minute-remaining milestones | Each applicable cue is delivered once within the documented timing behavior |
| A03 | Ask whether food is done; receive no reply | Task stays unconfirmed; follow-ups are bounded |
| A04 | User requests two more minutes | Old check-in is replaced and remaining time is correct |
| A05 | Complete a task | Obsolete queued and OS reminders are cancelled |
| A06 | Mute conversation during cooking | Wall-clock timers continue according to their stated policy |
| A07 | Log and correct a workout set | One corrected record remains, with the requested rest timer |
| V01 | Start a timed vocal routine | Blocks and transitions operate through the shared session engine |
| V02 | Record, stop, replay, and annotate a take | Recording is usable and associated with the correct block |
| V03 | Ordinary cue becomes due during a take | It is deferred or handled according to the practice policy |
| V04 | Resume a previous routine | Relevant approved notes are available and editable |
| G01 | Follow a real selected walking route | Guidance corresponds to the actual route and location updates |
| G02 | Receive a stale or inaccurate fix | App avoids false precise claims and indicates the condition |
| G03 | Change the route | Application state and guidance use the confirmed revised route |
| G04 | Lose connectivity | Behavior matches documented offline capabilities; errors are explicit |
| J01 | Dictate a note during any mode | Note is stored without losing activity/navigation/practice state |
| J02 | Correct/delete a summary or note | Saved records and next-session context reflect the change |
| H01 | Use phone input versus Bluetooth input | Actual route is recorded and both supported paths work |
| H02 | Lock the phone during an active session | Supported recording, cues, and recovery are demonstrated on hardware |
| H03 | Play music, invoke assistant, receive a call, disconnect earbuds | Audio/session state recovers without duplicate actions or lost accepted records |
| H04 | Launch using an advertised shortcut or earbud path | Exact tested conditions and limitations are recorded |

Use focused deterministic tests for timers, transitions, cancellation, and stale edits. Use route/audio provider fixtures for integration behavior. Physical-device testing is required for microphone routing, background/lock behavior, assistant handoff, and headset controls.

## 11. Implementation Sequence Within the Three-Mode Release

1. Resolve the target phone and test hardware; run short audio/background/launch feasibility checks.
2. Implement the shared session model, operations, persistence, scheduling, and direct editing.
3. Implement all three mode adapters and shared journaling. Parallel development is possible if explicitly authorized; a vocal-only product is not the completion target.
4. Exercise the end-to-end scenarios, including physical-device interruptions and recovery.
5. Dogfood real walks, activities, and practice sessions; adjust prompts, defaults, and intervention frequency from use.

At handoff, no framework, platform implementation, provider account, deployed service, hardware purchase, or completed acceptance test is recorded.
