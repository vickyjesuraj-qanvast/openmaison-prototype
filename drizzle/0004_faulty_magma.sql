CREATE TABLE `lead_files` (
	`id` text PRIMARY KEY NOT NULL,
	`lead_id` text NOT NULL,
	`kind` text NOT NULL,
	`name` text NOT NULL,
	`thumb` text,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`lead_id`) REFERENCES `leads`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `lead_files_lead_idx` ON `lead_files` (`lead_id`);--> statement-breakpoint
CREATE TABLE `lead_questionnaires` (
	`lead_id` text PRIMARY KEY NOT NULL,
	`total` integer NOT NULL,
	`client_answered` integer DEFAULT 0 NOT NULL,
	`studio_answered` integer DEFAULT 0 NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`lead_id`) REFERENCES `leads`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `lead_returns` (
	`id` text PRIMARY KEY NOT NULL,
	`lead_id` text NOT NULL,
	`status` text NOT NULL,
	`returned_by_id` text,
	`returned_at` integer NOT NULL,
	`reason` text NOT NULL,
	`replied_by` text,
	`replied_at` integer,
	`status_text` text,
	`refund_status` text,
	`credit_amount_minor` integer,
	`appeal_days` integer,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`lead_id`) REFERENCES `leads`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`returned_by_id`) REFERENCES `members`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `lead_returns_lead_idx` ON `lead_returns` (`lead_id`);--> statement-breakpoint
CREATE TABLE `quotes` (
	`id` text PRIMARY KEY NOT NULL,
	`lead_id` text NOT NULL,
	`number` text NOT NULL,
	`title` text NOT NULL,
	`amount_minor` integer NOT NULL,
	`visibility` text DEFAULT 'Private' NOT NULL,
	`status` text DEFAULT 'Draft' NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`lead_id`) REFERENCES `leads`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `quotes_lead_idx` ON `quotes` (`lead_id`);