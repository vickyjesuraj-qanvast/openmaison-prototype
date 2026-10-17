CREATE TABLE `beta_signups` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`studio_name` text,
	`email` text NOT NULL,
	`phone` text,
	`source_page` text DEFAULT 'landing' NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `beta_signups_email_idx` ON `beta_signups` (`email`);--> statement-breakpoint
CREATE INDEX `beta_signups_created_idx` ON `beta_signups` (`created_at`);--> statement-breakpoint
CREATE TABLE `contact_messages` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`email` text NOT NULL,
	`subject` text,
	`message` text NOT NULL,
	`source_page` text DEFAULT 'contact' NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `contact_messages_created_idx` ON `contact_messages` (`created_at`);--> statement-breakpoint
CREATE TABLE `newsletter_subscribers` (
	`id` text PRIMARY KEY NOT NULL,
	`email` text NOT NULL,
	`source_page` text DEFAULT 'footer' NOT NULL,
	`created_at` integer NOT NULL,
	`unsubscribed_at` integer
);
--> statement-breakpoint
CREATE UNIQUE INDEX `newsletter_subscribers_email_uq` ON `newsletter_subscribers` (`email`);