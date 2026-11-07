CREATE TABLE `speech_plans` (
	`id` text PRIMARY KEY NOT NULL,
	`title` text NOT NULL,
	`kind` text NOT NULL,
	`language` text NOT NULL,
	`target_ms` integer NOT NULL,
	`sections_json` text NOT NULL,
	`script` text,
	`prompt_id` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`practice_count` integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
ALTER TABLE `takes` ADD `plan_id` text;--> statement-breakpoint
ALTER TABLE `takes` ADD `boundaries_json` text;--> statement-breakpoint
ALTER TABLE `takes` ADD `transcript_job_id` text;--> statement-breakpoint
ALTER TABLE `takes` ADD `transcript_state` text;--> statement-breakpoint
ALTER TABLE `takes` ADD `transcript_json` text;--> statement-breakpoint
ALTER TABLE `takes` ADD `report_json` text;