CREATE TABLE `homeowner_lead_links` (
	`id` text PRIMARY KEY NOT NULL,
	`homeowner_id` text NOT NULL,
	`lead_id` text NOT NULL,
	`portal_token` text NOT NULL,
	`chat_history_visible` integer DEFAULT true NOT NULL,
	`invited_at` integer,
	`last_asked_at` integer,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`homeowner_id`) REFERENCES `homeowner_profiles`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`lead_id`) REFERENCES `leads`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `homeowner_lead_links_lead` ON `homeowner_lead_links` (`lead_id`);--> statement-breakpoint
CREATE TABLE `homeowner_profiles` (
	`id` text PRIMARY KEY NOT NULL,
	`phone` text NOT NULL,
	`name` text NOT NULL,
	`email` text,
	`created_at` integer NOT NULL,
	`updated_at` integer
);
--> statement-breakpoint
CREATE UNIQUE INDEX `homeowner_profiles_phone` ON `homeowner_profiles` (`phone`);--> statement-breakpoint
ALTER TABLE `lead_returns` ADD `sub_reasons` text;--> statement-breakpoint
ALTER TABLE `lead_returns` ADD `detail` text;--> statement-breakpoint
ALTER TABLE `leads` ADD `qanvast_lead_id` text;