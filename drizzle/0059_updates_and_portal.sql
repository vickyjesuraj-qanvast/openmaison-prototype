CREATE TABLE `portal_addresses` (
	`slug` text PRIMARY KEY NOT NULL,
	`created_at` integer NOT NULL,
	`created_by` text,
	`retired_at` integer
);
--> statement-breakpoint
CREATE TABLE `portal_sessions` (
	`id` text PRIMARY KEY NOT NULL,
	`homeowner_id` text NOT NULL,
	`kind` text DEFAULT 'client' NOT NULL,
	`member_id` text,
	`created_at` integer NOT NULL,
	`expires_at` integer NOT NULL,
	`last_seen_at` integer,
	`ended_at` integer,
	FOREIGN KEY (`homeowner_id`) REFERENCES `homeowner_profiles`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `portal_sessions_homeowner_idx` ON `portal_sessions` (`homeowner_id`);--> statement-breakpoint
CREATE TABLE `project_update_files` (
	`update_id` text NOT NULL,
	`file_id` text NOT NULL,
	`position` integer DEFAULT 0 NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`update_id`) REFERENCES `project_updates`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`file_id`) REFERENCES `lead_files`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `project_update_files_uq` ON `project_update_files` (`update_id`,`file_id`);--> statement-breakpoint
CREATE INDEX `project_update_files_file_idx` ON `project_update_files` (`file_id`);--> statement-breakpoint
CREATE TABLE `project_updates` (
	`id` text PRIMARY KEY NOT NULL,
	`project_id` text NOT NULL,
	`title` text NOT NULL,
	`body` text,
	`milestone_id` text,
	`status` text DEFAULT 'draft' NOT NULL,
	`author_id` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`edited_at` integer,
	`edited_by` text,
	`submitted_by` text,
	`submitted_at` integer,
	`reviewed_by` text,
	`reviewed_at` integer,
	`review_note` text,
	`published_by` text,
	`published_at` integer,
	`withdrawn_by` text,
	`withdrawn_at` integer,
	`client_opened_at` integer,
	`deleted_at` integer,
	`deleted_by` text,
	FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `project_updates_project_idx` ON `project_updates` (`project_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `project_updates_status_idx` ON `project_updates` (`status`);--> statement-breakpoint
ALTER TABLE `homeowner_lead_links` ADD `invited_by` text;--> statement-breakpoint
ALTER TABLE `homeowner_lead_links` ADD `opened_at` integer;--> statement-breakpoint
ALTER TABLE `homeowner_lead_links` ADD `last_opened_at` integer;--> statement-breakpoint
ALTER TABLE `homeowner_lead_links` ADD `withdrawn_at` integer;--> statement-breakpoint
ALTER TABLE `homeowner_lead_links` ADD `withdrawn_by` text;--> statement-breakpoint
ALTER TABLE `lead_files` ADD `shown_to_client_at` integer;