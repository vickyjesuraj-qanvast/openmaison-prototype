CREATE TABLE `file_comments` (
	`id` text PRIMARY KEY NOT NULL,
	`file_id` text NOT NULL,
	`author_id` text NOT NULL,
	`body` text NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer,
	FOREIGN KEY (`file_id`) REFERENCES `lead_files`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `file_comments_file_idx` ON `file_comments` (`file_id`);--> statement-breakpoint
ALTER TABLE `lead_files` ADD `parent_id` text;--> statement-breakpoint
ALTER TABLE `lead_files` ADD `owner_id` text;--> statement-breakpoint
ALTER TABLE `lead_files` ADD `size_bytes` integer;--> statement-breakpoint
ALTER TABLE `lead_files` ADD `mime` text;--> statement-breakpoint
ALTER TABLE `lead_files` ADD `updated_at` integer;--> statement-breakpoint
ALTER TABLE `lead_files` ADD `deleted_at` integer;