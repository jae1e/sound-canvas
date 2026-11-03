ALTER TABLE `places` ADD `external_id` text;--> statement-breakpoint
ALTER TABLE `plan_templates` ADD `kind` text DEFAULT 'work' NOT NULL;--> statement-breakpoint
ALTER TABLE `routes` ADD `kind` text DEFAULT 'walked' NOT NULL;--> statement-breakpoint
ALTER TABLE `takes` ADD `block_id` text;