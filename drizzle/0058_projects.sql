CREATE TABLE `projects` (
	`id` text PRIMARY KEY NOT NULL,
	`lead_id` text NOT NULL,
	`number` text NOT NULL,
	`name` text NOT NULL,
	`stage` text DEFAULT 'setting_up' NOT NULL,
	`project_type` text,
	`quote_id` text,
	`contract_id` text,
	`agreed_value_minor` integer,
	`payment_template` text,
	`start_date` integer,
	`target_end_date` integer,
	`started_at` integer,
	`completed_at` integer,
	`created_by` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`deleted_at` integer,
	`deleted_by` text,
	FOREIGN KEY (`lead_id`) REFERENCES `leads`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`quote_id`) REFERENCES `quotes`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`contract_id`) REFERENCES `contracts`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE UNIQUE INDEX `projects_lead_uq` ON `projects` (`lead_id`);--> statement-breakpoint
CREATE INDEX `projects_stage_idx` ON `projects` (`stage`);--> statement-breakpoint
ALTER TABLE `lead_events` ADD `project_id` text;--> statement-breakpoint
CREATE INDEX `lead_events_project_idx` ON `lead_events` (`project_id`);--> statement-breakpoint
ALTER TABLE `leads` ADD `direct` integer DEFAULT false NOT NULL;