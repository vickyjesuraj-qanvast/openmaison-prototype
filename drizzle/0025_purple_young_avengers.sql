CREATE TABLE `quote_comparisons` (
	`id` text PRIMARY KEY NOT NULL,
	`lead_id` text,
	`quote_id` text,
	`your_label` text NOT NULL,
	`other_studio` text NOT NULL,
	`other_file` text NOT NULL,
	`result_json` text NOT NULL,
	`created_by` text NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`lead_id`) REFERENCES `leads`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`quote_id`) REFERENCES `quotes`(`id`) ON UPDATE no action ON DELETE set null
);
