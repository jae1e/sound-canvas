# Voice Coach app architecture

## Sources of truth

- Native `vc-audio` owns capture, playback, beat timing, and audio route state.
- SQLite owns takes, plans, exercises, results, and progress.
- The paired home server owns final speech transcripts.
- SecureStore owns the server token. UI stores are caches.

## State and lifecycle

Pure derivation functions produce visible status and controls from native facts and SQLite rows. Reconcile native state and local rows on app start and resume. A take never starts on its own; leaving its screen stops and saves it, and returning from background does not resume it.

## Navigation

Home is the root. Main destinations are Home, Sing, Speak, Takes, and Settings. Deep links keep Home underneath through the initial route. Return to Home by popping when possible. Sing and Speak share the studio screen with their selected practice mode.

Travel Guide and Work Partner remain hidden behind Settings → Labs → Show hidden modes. The default is off; while off, do not restore sessions or wire hidden mode controllers.

## Updates

Check at start and resume no more than hourly. Download through `vc-update`, show progress and speed, allow cancellation, request install permission when needed, and clean old update files on start. Do not update during recording.
