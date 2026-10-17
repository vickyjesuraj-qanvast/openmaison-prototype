CREATE TABLE `lead_file_thumbs` (
	`file_id` text PRIMARY KEY NOT NULL,
	`data` text NOT NULL,
	FOREIGN KEY (`file_id`) REFERENCES `lead_files`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `notification_outbox` (
	`id` text PRIMARY KEY NOT NULL,
	`key` text NOT NULL,
	`notification_id` text,
	`event` text NOT NULL,
	`channel` text NOT NULL,
	`member_id` text,
	`to_name` text NOT NULL,
	`to_address` text,
	`subject` text,
	`body` text NOT NULL,
	`href` text,
	`lead_id` text,
	`status` text NOT NULL,
	`error` text,
	`provider` text NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `notification_outbox_key_uq` ON `notification_outbox` (`key`);--> statement-breakpoint
CREATE INDEX `notification_outbox_created_idx` ON `notification_outbox` (`created_at`);