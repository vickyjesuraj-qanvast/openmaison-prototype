CREATE TABLE `quote_files` (
	`quote_id` text NOT NULL,
	`file_id` text NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`quote_id`) REFERENCES `quotes`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`file_id`) REFERENCES `lead_files`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `quote_files_quote_idx` ON `quote_files` (`quote_id`);--> statement-breakpoint
ALTER TABLE `quotes` ADD `files_visible` integer DEFAULT true NOT NULL;