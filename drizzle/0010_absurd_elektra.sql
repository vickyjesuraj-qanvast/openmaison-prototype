CREATE TABLE `questions` (
	`id` text PRIMARY KEY NOT NULL,
	`lead_id` text NOT NULL,
	`text` text NOT NULL,
	`type` text NOT NULL,
	`options` text,
	`answer` text,
	`answered_by` text,
	`answered_at` integer,
	`sort_order` integer DEFAULT 0 NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`lead_id`) REFERENCES `leads`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `questions_lead_idx` ON `questions` (`lead_id`);