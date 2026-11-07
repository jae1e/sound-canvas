import { index, integer, real, sqliteTable, text } from 'drizzle-orm/sqlite-core';

/**
 * Schema from v1-spec section 1.3: sessions, tasks, timers, events, journal entries, takes, places, routes, settings
 * (plus plan templates for Work Partner).
 *
 * `sessions.state_json` is the authoritative engine state and is what gets restored; `tasks` and `timers` mirror it
 * as queryable rows. All times are epoch milliseconds.
 */

export const sessions = sqliteTable(
  'sessions',
  {
    id: text('id').primaryKey(),
    /** Engine session mode: walk, activity, vocal or journal. */
    mode: text('mode').notNull(),
    status: text('status').notNull(),
    lang: text('lang').notNull(),
    revision: integer('revision').notNull(),
    title: text('title'),
    /** Full engine `Session` as JSON; validated with `parseSession` on restore. */
    stateJson: text('state_json').notNull(),
    createdAt: integer('created_at').notNull(),
    startedAt: integer('started_at'),
    endedAt: integer('ended_at'),
    updatedAt: integer('updated_at').notNull(),
  },
  (t) => [index('sessions_status_idx').on(t.status), index('sessions_updated_idx').on(t.updatedAt)],
);

export const tasks = sqliteTable(
  'tasks',
  {
    id: text('id').primaryKey(),
    sessionId: text('session_id').notNull(),
    label: text('label').notNull(),
    status: text('status').notNull(),
    /** Plan position of a step; null for free-standing tasks. */
    position: integer('position'),
    estimateMs: integer('estimate_ms'),
    startedAt: integer('started_at'),
    createdAt: integer('created_at').notNull(),
    updatedAt: integer('updated_at').notNull(),
  },
  (t) => [index('tasks_session_idx').on(t.sessionId)],
);

export const timers = sqliteTable(
  'timers',
  {
    id: text('id').primaryKey(),
    sessionId: text('session_id').notNull(),
    taskId: text('task_id'),
    label: text('label').notNull(),
    durationMs: integer('duration_ms').notNull(),
    state: text('state').notNull(),
    clockPolicy: text('clock_policy').notNull(),
    accumulatedMs: integer('accumulated_ms').notNull(),
    runningSince: integer('running_since'),
    createdAt: integer('created_at').notNull(),
    updatedAt: integer('updated_at').notNull(),
  },
  (t) => [index('timers_session_idx').on(t.sessionId)],
);

/** Append-only log: applied actions, utterances, llm_needed questions, cues. */
export const events = sqliteTable(
  'events',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    sessionId: text('session_id'),
    at: integer('at').notNull(),
    kind: text('kind').notNull(),
    payloadJson: text('payload_json').notNull(),
  },
  (t) => [index('events_session_idx').on(t.sessionId, t.at), index('events_kind_idx').on(t.kind)],
);

export const JOURNAL_SOURCES = ['user_note', 'transcript', 'generated_summary'] as const;
export type JournalSource = (typeof JOURNAL_SOURCES)[number];

export const journalEntries = sqliteTable(
  'journal_entries',
  {
    id: text('id').primaryKey(),
    sessionId: text('session_id'),
    /** Product mode: travel, work or voice_coach (or 'general'). */
    mode: text('mode').notNull(),
    source: text('source').notNull().$type<JournalSource>(),
    /** The text as spoken or generated; never edited. */
    originalText: text('original_text').notNull(),
    /** The editable version shown in the UI. */
    text: text('text').notNull(),
    taskId: text('task_id'),
    /** Step label at the time of writing, so the link stays readable after the step is renamed or removed. */
    taskLabel: text('task_label'),
    takeId: text('take_id'),
    placeId: text('place_id'),
    latitude: real('latitude'),
    longitude: real('longitude'),
    accuracyM: real('accuracy_m'),
    createdAt: integer('created_at').notNull(),
    updatedAt: integer('updated_at').notNull(),
  },
  (t) => [index('journal_created_idx').on(t.createdAt), index('journal_session_idx').on(t.sessionId)],
);

/** Recorded audio files (Voice Coach, M2). */
export const takes = sqliteTable(
  'takes',
  {
    id: text('id').primaryKey(),
    sessionId: text('session_id'),
    fileUri: text('file_uri').notNull(),
    /** Practice block (a `plan_templates` row of kind `coach_block`) the take was recorded for. */
    blockId: text('block_id'),
    durationMs: integer('duration_ms'),
    note: text('note'),
    metricsJson: text('metrics_json'),
    kind: text('kind').notNull().default('song'),
    title: text('title'),
    asrPath: text('asr_path'),
    inputJson: text('input_json'),
    outputJson: text('output_json'),
    beatJson: text('beat_json'),
    analysisJson: text('analysis_json'),
    recovered: integer('recovered').notNull().default(0),
    createdAt: integer('created_at').notNull(),
  },
  (t) => [index('takes_session_idx').on(t.sessionId)],
);

/** Saved places (Travel Guide, M3). */
export const places = sqliteTable('places', {
  id: text('id').primaryKey(),
  /** Provider place id (for example the Kakao place id), used to avoid saving the same place twice. */
  externalId: text('external_id'),
  name: text('name').notNull(),
  address: text('address'),
  latitude: real('latitude').notNull(),
  longitude: real('longitude').notNull(),
  category: text('category'),
  source: text('source'),
  createdAt: integer('created_at').notNull(),
});

/** Walked or planned routes (Travel Guide, M3). */
export const routes = sqliteTable(
  'routes',
  {
    id: text('id').primaryKey(),
    sessionId: text('session_id'),
    /** `walked` (GPS walk log) or `planned` (route preview). */
    kind: text('kind').notNull().default('walked'),
    fromPlaceId: text('from_place_id'),
    toPlaceId: text('to_place_id'),
    distanceM: real('distance_m'),
    durationMs: integer('duration_ms'),
    geometryJson: text('geometry_json'),
    startedAt: integer('started_at'),
    endedAt: integer('ended_at'),
    createdAt: integer('created_at').notNull(),
  },
  (t) => [index('routes_session_idx').on(t.sessionId)],
);

export const settings = sqliteTable('settings', {
  key: text('key').primaryKey(),
  valueJson: text('value_json').notNull(),
  updatedAt: integer('updated_at').notNull(),
});

/** Work Partner plan templates saved by the user. */
export const planTemplates = sqliteTable('plan_templates', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  /** `work` (plan template, steps in `steps_json`) or `coach_block` (Voice Coach practice block, block JSON in `steps_json`). */
  kind: text('kind').notNull().default('work'),
  lang: text('lang'),
  stepsJson: text('steps_json').notNull(),
  createdAt: integer('created_at').notNull(),
  updatedAt: integer('updated_at').notNull(),
});

/** Work Partner routines (workout, stretching, poomsae). `routine_json` is a validated engine `RoutineTemplate`. */
export const routineTemplates = sqliteTable('routine_templates', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  lang: text('lang').notNull(),
  routineJson: text('routine_json').notNull(),
  createdAt: integer('created_at').notNull(),
  updatedAt: integer('updated_at').notNull(),
  /** Last time a session started from this routine ("start my last routine"). */
  lastUsedAt: integer('last_used_at'),
});

/**
 * Personal correction notes per routine template (and per movement or item). `template_id` may name a built-in routine
 * that has no row in `routine_templates`, so there is deliberately no foreign key.
 */
export const routineCorrections = sqliteTable(
  'routine_corrections',
  {
    id: text('id').primaryKey(),
    templateId: text('template_id').notNull(),
    itemId: text('item_id'),
    movementId: text('movement_id'),
    movementNo: integer('movement_no'),
    /** The note as said or typed. */
    text: text('text').notNull(),
    /** Short spoken cue derived from the note. */
    cue: text('cue').notNull(),
    side: text('side'),
    part: text('part'),
    lang: text('lang').notNull(),
    fixed: integer('fixed').notNull().default(0),
    shown: integer('shown').notNull().default(0),
    createdAt: integer('created_at').notNull(),
    updatedAt: integer('updated_at').notNull(),
  },
  (t) => [index('routine_corrections_template_idx').on(t.templateId)],
);

/** One finished (or abandoned) routine session. `used_template_id` is the template it started from, built-in or saved. */
export const routineRuns = sqliteTable(
  'routine_runs',
  {
    id: text('id').primaryKey(),
    templateId: text('template_id').notNull(),
    templateName: text('template_name').notNull(),
    lang: text('lang').notNull(),
    startedAt: integer('started_at').notNull(),
    endedAt: integer('ended_at'),
    endedEarly: integer('ended_early').notNull().default(0),
    /** Deviations, cue counts and pace summary as JSON. */
    summaryJson: text('summary_json'),
  },
  (t) => [index('routine_runs_started_idx').on(t.startedAt)],
);
