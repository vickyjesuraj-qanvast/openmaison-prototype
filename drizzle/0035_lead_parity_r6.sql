CREATE TABLE `lead_custom_field_values` (
	`id` text PRIMARY KEY NOT NULL,
	`lead_id` text NOT NULL,
	`field_id` text NOT NULL,
	`value` text,
	FOREIGN KEY (`lead_id`) REFERENCES `leads`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`field_id`) REFERENCES `lead_custom_fields`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `lead_custom_field_values_unique` ON `lead_custom_field_values` (`lead_id`,`field_id`);--> statement-breakpoint
CREATE INDEX `lead_custom_field_values_lead_idx` ON `lead_custom_field_values` (`lead_id`);--> statement-breakpoint
CREATE TABLE `lead_custom_fields` (
	`id` text PRIMARY KEY NOT NULL,
	`label` text NOT NULL,
	`field_type` text DEFAULT 'text' NOT NULL,
	`options` text,
	`is_required` integer DEFAULT false NOT NULL,
	`order_index` integer DEFAULT 0 NOT NULL,
	`is_active` integer DEFAULT true NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `studio_scope_questions` (
	`id` text PRIMARY KEY NOT NULL,
	`question` text NOT NULL,
	`question_type` text NOT NULL,
	`options` text,
	`is_required` integer DEFAULT false NOT NULL,
	`is_enabled` integer DEFAULT true NOT NULL,
	`sort_order` integer DEFAULT 0 NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
ALTER TABLE `members` ADD `accepting_leads` integer DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE `members` ADD `lead_preferences` text;--> statement-breakpoint
ALTER TABLE `members` ADD `specialty` text;