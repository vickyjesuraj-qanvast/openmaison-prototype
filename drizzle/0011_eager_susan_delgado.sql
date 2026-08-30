CREATE TABLE `return_attachments` (
	`return_id` text NOT NULL,
	`file_id` text NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`return_id`) REFERENCES `lead_returns`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`file_id`) REFERENCES `lead_files`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `return_attachments_return_idx` ON `return_attachments` (`return_id`);--> statement-breakpoint
ALTER TABLE `lead_returns` ADD `first_outreach_at` integer;--> statement-breakpoint
ALTER TABLE `lead_returns` ADD `attempts` integer;--> statement-breakpoint
ALTER TABLE `lead_returns` ADD `comments` text;--> statement-breakpoint
ALTER TABLE `lead_returns` ADD `reply_reason` text;--> statement-breakpoint
ALTER TABLE `lead_returns` ADD `reply_remarks` text;--> statement-breakpoint
ALTER TABLE `lead_returns` ADD `stage_before` text;--> statement-breakpoint
ALTER TABLE `lead_returns` ADD `stage_log_id` text;--> statement-breakpoint
ALTER TABLE `lead_returns` ADD `task_id` text;