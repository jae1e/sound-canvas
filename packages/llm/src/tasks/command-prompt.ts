import type { Mode } from '../actions';

/** Field and action reference shared by the `align` and `command` prompts (static text, so it caches well). */
export const FIELD_GUIDE = `Output fields: type, target, label, from, seconds, count, flag. Unused fields: "" / 0 / false.
- target: the EXACT existing task/timer name from the context that the user refers to; "" if they mean the obvious/only one.
- label: a NEW name (start_timer, add_task, add_step) or the replacement exercise (swap). Keep the user's own words, fixing obvious speech-recognition slips toward names in the context.
- from: the exercise being replaced (swap), "" if the current one.
- seconds: durations in seconds ("5분"=300, "반 시간"=1800, "two and a half minutes"=150).
- count: a repetition count or movement number.
- flag: true to turn quiet ON, false to turn it OFF (set_quiet only).`;

const WORK_ACTIONS = `Action types (work mode):
start_timer(label, seconds) | extend_timer(target, seconds) | pause_timer(target) | resume_timer(target) | cancel_timer(target)
task_done(target) | task_not_yet(target) | skip_task(target) | extend_task(target, seconds) | add_task(label) | add_step(label)
next_step | prev_step | set_quiet(flag, seconds=0 means until turned off) | pause_session | resume_session | end_session | none`;

const ROUTINE_ACTIONS = `Action types (routine mode):
skip | more_reps(count) | sets_add | sets_remove | rest(seconds) | swap(from, label) | repeat_from(count = movement number) | back
tempo_slower | tempo_faster | pause | resume | query_left | query_next | end | none`;

export const actionReference = (mode: Mode): string => (mode === 'work' ? WORK_ACTIONS : ROUTINE_ACTIONS);
