CREATE TABLE `floor_plan_photos` (
	`id` text PRIMARY KEY NOT NULL,
	`lead_id` text,
	`file_id` text,
	`name` text NOT NULL,
	`width` integer NOT NULL,
	`height` integer NOT NULL,
	`scale_mm_per_px` real,
	`picture` text NOT NULL,
	`created_by` text,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`lead_id`) REFERENCES `leads`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `floor_plan_photos_lead_idx` ON `floor_plan_photos` (`lead_id`);