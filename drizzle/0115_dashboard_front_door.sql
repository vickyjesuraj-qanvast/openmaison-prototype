CREATE TABLE `dashboard_snoozes` (
	`member_id` text NOT NULL,
	`row_key` text NOT NULL,
	`until_day` integer NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `dashboard_snoozes_uq` ON `dashboard_snoozes` (`member_id`,`row_key`);--> statement-breakpoint
ALTER TABLE `members` ADD `dashboard_seen_at` integer;--> statement-breakpoint
ALTER TABLE `members` ADD `dashboard_since_at` integer;--> statement-breakpoint
ALTER TABLE `members` ADD `dashboard_prefs` text;