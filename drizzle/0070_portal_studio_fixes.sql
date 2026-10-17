CREATE TABLE `portal_previews` (
	`id` text PRIMARY KEY NOT NULL,
	`lead_id` text NOT NULL,
	`person_id` text,
	`member_id` text NOT NULL,
	`frame` integer DEFAULT false NOT NULL,
	`money` integer DEFAULT true NOT NULL,
	`created_at` integer NOT NULL,
	`expires_at` integer NOT NULL,
	`ended_at` integer,
	FOREIGN KEY (`lead_id`) REFERENCES `leads`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `portal_previews_lead_idx` ON `portal_previews` (`lead_id`);--> statement-breakpoint
CREATE INDEX `portal_previews_member_idx` ON `portal_previews` (`member_id`);