CREATE TABLE `lead_file_images` (
	`file_id` text PRIMARY KEY NOT NULL,
	`data` text NOT NULL,
	FOREIGN KEY (`file_id`) REFERENCES `lead_files`(`id`) ON UPDATE no action ON DELETE cascade
);
