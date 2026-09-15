CREATE TABLE `quote_text_templates` (
	`id` text PRIMARY KEY NOT NULL,
	`kind` text NOT NULL,
	`title` text NOT NULL,
	`body` text NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer
);
--> statement-breakpoint
ALTER TABLE `quotes` ADD `terms_html` text;--> statement-breakpoint
ALTER TABLE `quotes` ADD `notes_html` text;--> statement-breakpoint
ALTER TABLE `quotes` ADD `terms_visible` integer DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE `quotes` ADD `notes_visible` integer DEFAULT true NOT NULL;