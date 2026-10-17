CREATE TABLE `studio_invitations` (
	`id` text PRIMARY KEY NOT NULL,
	`member_id` text NOT NULL,
	`invited_by` text,
	`full_name` text NOT NULL,
	`phone` text,
	`email` text,
	`role` text NOT NULL,
	`token` text NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`expires_at` integer NOT NULL,
	`sent_at` integer,
	`send_count` integer DEFAULT 0 NOT NULL,
	`channels` text,
	`accepted_at` integer,
	`cancelled_at` integer,
	`cancelled_by` text,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`member_id`) REFERENCES `members`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `studio_invitations_token_idx` ON `studio_invitations` (`token`);--> statement-breakpoint
CREATE INDEX `studio_invitations_member_idx` ON `studio_invitations` (`member_id`);