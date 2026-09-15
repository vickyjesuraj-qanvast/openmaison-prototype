CREATE TABLE `quote_templates` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`kind` text DEFAULT 'design' NOT NULL,
	`is_default` integer DEFAULT false NOT NULL,
	`last_used_at` integer,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
ALTER TABLE `quotes` ADD `template_id` text;