CREATE TABLE `contracts` (
	`id` text PRIMARY KEY NOT NULL,
	`lead_id` text NOT NULL,
	`title` text NOT NULL,
	`status` text DEFAULT 'Draft' NOT NULL,
	`created_at` integer NOT NULL,
	`sent_at` integer,
	`signed_at` integer,
	`signed_copy` text,
	`updated_at` integer,
	`archived_at` integer,
	`deleted_at` integer,
	FOREIGN KEY (`lead_id`) REFERENCES `leads`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `contracts_lead_idx` ON `contracts` (`lead_id`);