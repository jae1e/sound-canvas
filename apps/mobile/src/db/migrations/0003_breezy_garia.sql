ALTER TABLE `takes` ADD `kind` text DEFAULT 'song' NOT NULL;--> statement-breakpoint
ALTER TABLE `takes` ADD `title` text;--> statement-breakpoint
ALTER TABLE `takes` ADD `asr_path` text;--> statement-breakpoint
ALTER TABLE `takes` ADD `input_json` text;--> statement-breakpoint
ALTER TABLE `takes` ADD `output_json` text;--> statement-breakpoint
ALTER TABLE `takes` ADD `beat_json` text;--> statement-breakpoint
ALTER TABLE `takes` ADD `analysis_json` text;--> statement-breakpoint
ALTER TABLE `takes` ADD `recovered` integer DEFAULT 0 NOT NULL;