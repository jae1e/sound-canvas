CREATE TABLE `events` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`session_id` text,
	`at` integer NOT NULL,
	`kind` text NOT NULL,
	`payload_json` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `events_session_idx` ON `events` (`session_id`,`at`);--> statement-breakpoint
CREATE INDEX `events_kind_idx` ON `events` (`kind`);--> statement-breakpoint
CREATE TABLE `journal_entries` (
	`id` text PRIMARY KEY NOT NULL,
	`session_id` text,
	`mode` text NOT NULL,
	`source` text NOT NULL,
	`original_text` text NOT NULL,
	`text` text NOT NULL,
	`task_id` text,
	`task_label` text,
	`take_id` text,
	`place_id` text,
	`latitude` real,
	`longitude` real,
	`accuracy_m` real,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `journal_created_idx` ON `journal_entries` (`created_at`);--> statement-breakpoint
CREATE INDEX `journal_session_idx` ON `journal_entries` (`session_id`);--> statement-breakpoint
CREATE TABLE `places` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`address` text,
	`latitude` real NOT NULL,
	`longitude` real NOT NULL,
	`category` text,
	`source` text,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `plan_templates` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`lang` text,
	`steps_json` text NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `routes` (
	`id` text PRIMARY KEY NOT NULL,
	`session_id` text,
	`from_place_id` text,
	`to_place_id` text,
	`distance_m` real,
	`duration_ms` integer,
	`geometry_json` text,
	`started_at` integer,
	`ended_at` integer,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `routes_session_idx` ON `routes` (`session_id`);--> statement-breakpoint
CREATE TABLE `sessions` (
	`id` text PRIMARY KEY NOT NULL,
	`mode` text NOT NULL,
	`status` text NOT NULL,
	`lang` text NOT NULL,
	`revision` integer NOT NULL,
	`title` text,
	`state_json` text NOT NULL,
	`created_at` integer NOT NULL,
	`started_at` integer,
	`ended_at` integer,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `sessions_status_idx` ON `sessions` (`status`);--> statement-breakpoint
CREATE INDEX `sessions_updated_idx` ON `sessions` (`updated_at`);--> statement-breakpoint
CREATE TABLE `settings` (
	`key` text PRIMARY KEY NOT NULL,
	`value_json` text NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `takes` (
	`id` text PRIMARY KEY NOT NULL,
	`session_id` text,
	`file_uri` text NOT NULL,
	`duration_ms` integer,
	`note` text,
	`metrics_json` text,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `takes_session_idx` ON `takes` (`session_id`);--> statement-breakpoint
CREATE TABLE `tasks` (
	`id` text PRIMARY KEY NOT NULL,
	`session_id` text NOT NULL,
	`label` text NOT NULL,
	`status` text NOT NULL,
	`position` integer,
	`estimate_ms` integer,
	`started_at` integer,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `tasks_session_idx` ON `tasks` (`session_id`);--> statement-breakpoint
CREATE TABLE `timers` (
	`id` text PRIMARY KEY NOT NULL,
	`session_id` text NOT NULL,
	`task_id` text,
	`label` text NOT NULL,
	`duration_ms` integer NOT NULL,
	`state` text NOT NULL,
	`clock_policy` text NOT NULL,
	`accumulated_ms` integer NOT NULL,
	`running_since` integer,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `timers_session_idx` ON `timers` (`session_id`);