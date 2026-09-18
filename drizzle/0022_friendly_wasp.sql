CREATE TABLE `quote_template_versions` (
	`id` text PRIMARY KEY NOT NULL,
	`template_id` text NOT NULL,
	`version` integer NOT NULL,
	`design_json` text NOT NULL,
	`defaults_json` text,
	`note` text,
	`published_at` integer NOT NULL,
	`published_by` text,
	FOREIGN KEY (`template_id`) REFERENCES `quote_templates`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
ALTER TABLE `quote_items` ADD `optional` integer DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `quote_templates` ADD `status` text DEFAULT 'published' NOT NULL;--> statement-breakpoint
ALTER TABLE `quote_templates` ADD `version` integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE `quote_templates` ADD `published_at` integer;--> statement-breakpoint
ALTER TABLE `quote_templates` ADD `updated_at` integer;--> statement-breakpoint
ALTER TABLE `quote_templates` ADD `updated_by` text;--> statement-breakpoint
ALTER TABLE `quote_templates` ADD `paper` text DEFAULT 'A4' NOT NULL;--> statement-breakpoint
ALTER TABLE `quote_templates` ADD `design_json` text;--> statement-breakpoint
ALTER TABLE `quote_templates` ADD `defaults_json` text;--> statement-breakpoint
ALTER TABLE `quote_templates` ADD `draft_json` text;--> statement-breakpoint
ALTER TABLE `quote_templates` ADD `draft_updated_at` integer;--> statement-breakpoint
ALTER TABLE `quote_templates` ADD `source_file` text;--> statement-breakpoint
ALTER TABLE `quote_templates` ADD `note` text;--> statement-breakpoint
ALTER TABLE `quotes` ADD `template_version` integer;--> statement-breakpoint
ALTER TABLE `quotes` ADD `client_view_json` text;