CREATE TABLE `routine_corrections` (
	`id` text PRIMARY KEY NOT NULL,
	`template_id` text NOT NULL,
	`item_id` text,
	`movement_id` text,
	`movement_no` integer,
	`text` text NOT NULL,
	`cue` text NOT NULL,
	`side` text,
	`part` text,
	`lang` text NOT NULL,
	`fixed` integer DEFAULT 0 NOT NULL,
	`shown` integer DEFAULT 0 NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `routine_corrections_template_idx` ON `routine_corrections` (`template_id`);--> statement-breakpoint
CREATE TABLE `routine_runs` (
	`id` text PRIMARY KEY NOT NULL,
	`template_id` text NOT NULL,
	`template_name` text NOT NULL,
	`lang` text NOT NULL,
	`started_at` integer NOT NULL,
	`ended_at` integer,
	`ended_early` integer DEFAULT 0 NOT NULL,
	`summary_json` text
);
--> statement-breakpoint
CREATE INDEX `routine_runs_started_idx` ON `routine_runs` (`started_at`);--> statement-breakpoint
CREATE TABLE `routine_templates` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`lang` text NOT NULL,
	`routine_json` text NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`last_used_at` integer
);
