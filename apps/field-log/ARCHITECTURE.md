# Field Voice Log app: state and navigation

## 1. Sources of truth

| Thing | Truth | Cached in |
|---|---|---|
| Recording, paused, silenced, input route, elapsed time | The native recorder (`getStatus`, plus `onJournal`, `onWave`, `onCapture`, `onInputs`) | `useRecorder`, `useInputs` |
| Memos, segments, photos, transcripts, outbox and sync state | The local SQLite database, projected from the native journal and the server pull | Screen queries (`useDbQuery`) |
| Final transcripts | The server (pulled by long poll into the database) | Database |
| Settings | SQLite `kv` (token in SecureStore); native also persists input and auto-stop | `useSettings` |

The zustand stores are caches. They are refreshed on app start, on AppState `active` and on native events. Components never assume them.

## 2. One derivation layer

`src/core/memoState.ts` holds the pure functions from facts to what the UI shows:
- `deriveMemoStatus`: the single status of a memo (recording, paused, deleted, upload waiting or uploading, transcribing, failed, no speech, done, saved), in a fixed priority order;
- `memoProgress`: the four-step progress line;
- `hasStaleRecording`: an open recording row while native is not recording that memo;
- `controlPhase`, `controlActions` and `statusLine` (`src/core/controls.ts`): which recorder buttons and which state line.

Screens build a `MemoFacts` object (database values plus the live native facts from `useLiveFacts`) and render only the derived result.

## 3. Reconciliation

`reconcile()` (`src/sync/reconcile.ts`) runs on app start, on AppState `active`, and when a list row sees a stale recording:
1. ingest the native journal (`readJournal` after the cursor);
2. read `getStatus` and update the recorder cache;
3. if native is idle, close local recordings that never got a stop (`interrupted`);
4. refresh inputs. Writes bump the data version, which refreshes the queries.

`recoverInterrupted()` runs once at start, before the first reconcile. JS never decides to stop a recording because of AppState: native owns leave-app stops.

## 4. Navigation rules

- Home (`index`) is the single root of the stack. Never push or replace to `/`. Leave a screen by popping: `goHome()` (`src/ui/nav.ts`) calls `back()` when it can and replaces only when nothing is below.
- `/new` is transient: it is replaced by the memo screen, so Back from a new memo returns to Home. Cancel is back.
- `unstable_settings.initialRouteName = 'index'` keeps Home underneath a deep link to `/memo/[id]`.
- Back on Home exits the app. Back from Settings returns to the previous screen.
- Leaving a memo screen while recording stops and saves (`stopOnLeaveScreen`) from `beforeRemove`, blur, hardware back and unmount. It is idempotent and decides from the native status.

## 5. Trust states (mvp-requirements A4)

| State | Computed as |
|---|---|
| Recording | Native says this memo is recording (not stale database rows) |
| Saved on phone | Not recording; every journal record is in the database and the audio files are on disk |
| Synced | No pending outbox events and no pending objects for the memo: the server accepted every event and verified every object hash |
| Transcribed | Synced, with at least one segment, and every segment has a terminal transcript (done or no speech) |

The list shows one status pill derived from these plus transcript problems. The memo screen also shows all four steps, with the current one in bold.
