CREATE TABLE `project_contractors` (
	`id` text PRIMARY KEY NOT NULL,
	`project_id` text NOT NULL,
	`vendor_id` text NOT NULL,
	`trade` text NOT NULL,
	`milestone_id` text,
	`start_date` integer,
	`end_date` integer,
	`status` text DEFAULT 'planned' NOT NULL,
	`note` text,
	`checked_by` text,
	`checked_at` integer,
	`created_by` text,
	`created_at` integer NOT NULL,
	`updated_by` text,
	`updated_at` integer NOT NULL,
	`removed_by` text,
	`removed_at` integer,
	FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`vendor_id`) REFERENCES `vendors`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `project_contractors_project_idx` ON `project_contractors` (`project_id`);--> statement-breakpoint
CREATE INDEX `project_contractors_vendor_idx` ON `project_contractors` (`vendor_id`);--> statement-breakpoint
ALTER TABLE `vendors` ADD `is_contractor` integer DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `vendors` ADD `trades_json` text;--> statement-breakpoint
ALTER TABLE `vendors` ADD `crew_capacity` integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE `vendors` ADD `code` text;