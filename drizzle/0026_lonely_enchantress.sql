CREATE TABLE `contract_templates` (
	`id` text PRIMARY KEY NOT NULL,
	`title` text NOT NULL,
	`body` text NOT NULL,
	`created_by` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`last_used_at` integer,
	`deleted_at` integer
);
--> statement-breakpoint
ALTER TABLE `contracts` ADD `body` text;--> statement-breakpoint
ALTER TABLE `contracts` ADD `recipient_name` text;--> statement-breakpoint
ALTER TABLE `contracts` ADD `recipient_phone` text;--> statement-breakpoint
ALTER TABLE `contracts` ADD `contract_date` integer;--> statement-breakpoint
ALTER TABLE `contracts` ADD `template_id` text;--> statement-breakpoint
ALTER TABLE `contracts` ADD `from_quote_id` text;--> statement-breakpoint
ALTER TABLE `contracts` ADD `source` text DEFAULT 'composed' NOT NULL;--> statement-breakpoint
ALTER TABLE `contracts` ADD `file_name` text;--> statement-breakpoint
ALTER TABLE `contracts` ADD `issuing_entity` text;--> statement-breakpoint
ALTER TABLE `contracts` ADD `reminders` integer DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `contracts` ADD `thank_you` integer DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `contracts` ADD `signed_by` text;--> statement-breakpoint
ALTER TABLE `contracts` ADD `created_by` text;