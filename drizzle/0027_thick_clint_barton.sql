CREATE TABLE `payment_templates` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`rows_json` text NOT NULL,
	`is_preset` integer DEFAULT false NOT NULL,
	`created_by` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`last_used_at` integer,
	`deleted_at` integer
);
--> statement-breakpoint
ALTER TABLE `lead_tasks` ADD `template_id` text;--> statement-breakpoint
ALTER TABLE `quote_templates` ADD `deleted_by` text;--> statement-breakpoint
ALTER TABLE `quote_text_templates` ADD `created_by` text;--> statement-breakpoint
ALTER TABLE `quote_text_templates` ADD `deleted_at` integer;--> statement-breakpoint
ALTER TABLE `quote_text_templates` ADD `last_used_at` integer;--> statement-breakpoint
ALTER TABLE `task_templates` ADD `created_by` text;--> statement-breakpoint
ALTER TABLE `task_templates` ADD `updated_at` integer;--> statement-breakpoint
ALTER TABLE `task_templates` ADD `deleted_at` integer;--> statement-breakpoint
ALTER TABLE `template_tasks` ADD `member_ids` text;--> statement-breakpoint
ALTER TABLE `template_tasks` ADD `tag_ids` text;--> statement-breakpoint
ALTER TABLE `template_tasks` ADD `due_days` integer;