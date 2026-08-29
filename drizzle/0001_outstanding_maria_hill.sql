CREATE TABLE `import_rows` (
	`id` text PRIMARY KEY NOT NULL,
	`import_id` text NOT NULL,
	`data` text NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`duplicate_of_lead_id` text,
	`matched_on` text,
	FOREIGN KEY (`import_id`) REFERENCES `imports`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `import_rows_import_idx` ON `import_rows` (`import_id`);--> statement-breakpoint
CREATE TABLE `imports` (
	`id` text PRIMARY KEY NOT NULL,
	`file_name` text NOT NULL,
	`total_rows` integer NOT NULL,
	`imported_rows` integer NOT NULL,
	`skipped_rows` integer DEFAULT 0 NOT NULL,
	`error_note` text,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `lead_assignees` (
	`id` text PRIMARY KEY NOT NULL,
	`lead_id` text NOT NULL,
	`member_id` text NOT NULL,
	FOREIGN KEY (`lead_id`) REFERENCES `leads`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`member_id`) REFERENCES `members`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `lead_assignees_lead_idx` ON `lead_assignees` (`lead_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `lead_assignees_unique` ON `lead_assignees` (`lead_id`,`member_id`);--> statement-breakpoint
CREATE TABLE `lead_tasks` (
	`id` text PRIMARY KEY NOT NULL,
	`lead_id` text NOT NULL,
	`title` text NOT NULL,
	`kind` text DEFAULT 'General' NOT NULL,
	`due_at` integer,
	`done` integer DEFAULT false NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`lead_id`) REFERENCES `leads`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `lead_tasks_lead_idx` ON `lead_tasks` (`lead_id`);--> statement-breakpoint
CREATE TABLE `leads` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`phone` text NOT NULL,
	`email` text,
	`source` text NOT NULL,
	`property_type` text NOT NULL,
	`property_address` text,
	`lead_address` text,
	`budget_minor` integer NOT NULL,
	`stage` text DEFAULT 'New' NOT NULL,
	`style` text,
	`key_collection` text,
	`condition` text,
	`area_sqft` integer,
	`estimated_start_date` integer,
	`notes` text,
	`deleted_at` integer,
	`delete_reason` text,
	`stage_before_delete` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `leads_stage_idx` ON `leads` (`stage`);--> statement-breakpoint
CREATE INDEX `leads_deleted_idx` ON `leads` (`deleted_at`);--> statement-breakpoint
CREATE TABLE `members` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`role` text NOT NULL,
	`color` text NOT NULL,
	`is_you` integer DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE `stage_logs` (
	`id` text PRIMARY KEY NOT NULL,
	`lead_id` text NOT NULL,
	`from_stage` text NOT NULL,
	`to_stage` text NOT NULL,
	`payload` text,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`lead_id`) REFERENCES `leads`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `stage_logs_lead_idx` ON `stage_logs` (`lead_id`);