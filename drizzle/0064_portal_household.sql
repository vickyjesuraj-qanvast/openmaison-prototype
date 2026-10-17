CREATE TABLE `homeowner_household_links` (
	`id` text PRIMARY KEY NOT NULL,
	`lead_id` text NOT NULL,
	`homeowner_id` text NOT NULL,
	`relationship` text,
	`added_by` text,
	`created_at` integer NOT NULL,
	`invited_at` integer,
	`invited_by` text,
	`opened_at` integer,
	`last_opened_at` integer,
	`withdrawn_at` integer,
	`withdrawn_by` text,
	`schedule_seen_at` integer,
	`removed_at` integer,
	`removed_by` text,
	FOREIGN KEY (`lead_id`) REFERENCES `leads`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`homeowner_id`) REFERENCES `homeowner_profiles`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `homeowner_household_links_uq` ON `homeowner_household_links` (`lead_id`,`homeowner_id`);--> statement-breakpoint
CREATE INDEX `homeowner_household_links_homeowner_idx` ON `homeowner_household_links` (`homeowner_id`);--> statement-breakpoint
CREATE TABLE `portal_bell_reads` (
	`homeowner_id` text NOT NULL,
	`row_key` text NOT NULL,
	`read_at` integer NOT NULL,
	FOREIGN KEY (`homeowner_id`) REFERENCES `homeowner_profiles`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `portal_bell_reads_uq` ON `portal_bell_reads` (`homeowner_id`,`row_key`);