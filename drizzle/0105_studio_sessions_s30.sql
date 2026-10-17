CREATE TABLE `studio_sessions` (
	`id` text PRIMARY KEY NOT NULL,
	`member_id` text NOT NULL,
	`remember` integer DEFAULT false NOT NULL,
	`via` text DEFAULT 'code' NOT NULL,
	`channel` text,
	`started_at` integer NOT NULL,
	`last_seen_at` integer NOT NULL,
	`expires_at` integer NOT NULL,
	`ended_at` integer,
	`ended_reason` text,
	`user_agent` text,
	FOREIGN KEY (`member_id`) REFERENCES `members`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `studio_sessions_member_idx` ON `studio_sessions` (`member_id`);