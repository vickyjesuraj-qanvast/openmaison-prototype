CREATE TABLE `hangout_designers` (
	`id` text PRIMARY KEY NOT NULL,
	`event_id` text NOT NULL,
	`member_id` text NOT NULL,
	`shift_ids` text DEFAULT '[]' NOT NULL,
	`share_pct` integer,
	`on_break_at` integer,
	`invite_id` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`event_id`) REFERENCES `hangout_events`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `hangout_designers_event_member_idx` ON `hangout_designers` (`event_id`,`member_id`);--> statement-breakpoint
CREATE TABLE `hangout_events` (
	`id` text PRIMARY KEY NOT NULL,
	`feed_ref` text,
	`name` text NOT NULL,
	`venue` text NOT NULL,
	`address` text,
	`starts_on` integer NOT NULL,
	`day_count` integer DEFAULT 1 NOT NULL,
	`start_time` text DEFAULT '10:00' NOT NULL,
	`end_time` text DEFAULT '18:00' NOT NULL,
	`price_per_table_minor` integer DEFAULT 750000 NOT NULL,
	`tables_per_studio` integer DEFAULT 2 NOT NULL,
	`total_tables` integer DEFAULT 50 NOT NULL,
	`studios_taking` integer DEFAULT 0 NOT NULL,
	`promised_meetings` integer DEFAULT 45 NOT NULL,
	`customer_profile` text,
	`studio_expectations` text,
	`description` text,
	`feed_status` text DEFAULT 'upcoming' NOT NULL,
	`sample` integer DEFAULT false NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `hangout_events_starts_idx` ON `hangout_events` (`starts_on`);--> statement-breakpoint
CREATE UNIQUE INDEX `hangout_events_feed_idx` ON `hangout_events` (`feed_ref`);--> statement-breakpoint
CREATE TABLE `hangout_meetings` (
	`id` text PRIMARY KEY NOT NULL,
	`event_id` text NOT NULL,
	`registration_id` text NOT NULL,
	`lead_id` text NOT NULL,
	`member_id` text,
	`shift_id` text,
	`table_number` integer,
	`status` text DEFAULT 'scheduled' NOT NULL,
	`outcome` text,
	`sub_status` text,
	`scope` text,
	`notes` text,
	`match_score` integer,
	`started_at` integer,
	`started_by` text,
	`ended_at` integer,
	`ended_by` text,
	`duration_min` integer,
	`meeting_id` text,
	`task_id` text,
	`assigned_by` text,
	`assigned_at` integer,
	`cancelled_at` integer,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`event_id`) REFERENCES `hangout_events`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `hangout_meetings_event_idx` ON `hangout_meetings` (`event_id`,`status`);--> statement-breakpoint
CREATE INDEX `hangout_meetings_lead_idx` ON `hangout_meetings` (`lead_id`);--> statement-breakpoint
CREATE INDEX `hangout_meetings_member_idx` ON `hangout_meetings` (`member_id`);--> statement-breakpoint
CREATE TABLE `hangout_participations` (
	`id` text PRIMARY KEY NOT NULL,
	`event_id` text NOT NULL,
	`status` text DEFAULT 'applied' NOT NULL,
	`tables` text DEFAULT '[]' NOT NULL,
	`applied_at` integer,
	`applied_by` text,
	`confirmed_at` integer,
	`withdrawn_at` integer,
	`preferences_json` text,
	`plan_saved_at` integer,
	`plan_sent_at` integer,
	`plan_sent_by` text,
	`page_token` text,
	`page_closed_at` integer,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`event_id`) REFERENCES `hangout_events`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `hangout_participations_event_idx` ON `hangout_participations` (`event_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `hangout_participations_page_idx` ON `hangout_participations` (`page_token`);--> statement-breakpoint
CREATE TABLE `hangout_registrations` (
	`id` text PRIMARY KEY NOT NULL,
	`event_id` text NOT NULL,
	`lead_id` text NOT NULL,
	`name` text NOT NULL,
	`phone` text NOT NULL,
	`email` text,
	`preferences_json` text,
	`shift_id` text,
	`via` text DEFAULT 'page' NOT NULL,
	`token` text NOT NULL,
	`created_by` text,
	`created_at` integer NOT NULL,
	`viewed_at` integer,
	`link_sent_at` integer,
	FOREIGN KEY (`event_id`) REFERENCES `hangout_events`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `hangout_registrations_token_idx` ON `hangout_registrations` (`token`);--> statement-breakpoint
CREATE INDEX `hangout_registrations_event_idx` ON `hangout_registrations` (`event_id`);--> statement-breakpoint
CREATE INDEX `hangout_registrations_lead_idx` ON `hangout_registrations` (`lead_id`);--> statement-breakpoint
CREATE TABLE `hangout_shifts` (
	`id` text PRIMARY KEY NOT NULL,
	`event_id` text NOT NULL,
	`label` text NOT NULL,
	`day_at` integer NOT NULL,
	`start_time` text NOT NULL,
	`end_time` text NOT NULL,
	`position` integer DEFAULT 0 NOT NULL,
	FOREIGN KEY (`event_id`) REFERENCES `hangout_events`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `hangout_shifts_event_idx` ON `hangout_shifts` (`event_id`,`position`);--> statement-breakpoint
CREATE TABLE `member_portfolio_pictures` (
	`id` text PRIMARY KEY NOT NULL,
	`portfolio_id` text NOT NULL,
	`data` text NOT NULL,
	`caption` text,
	`position` integer DEFAULT 0 NOT NULL,
	`source_file_id` text,
	`created_at` integer NOT NULL,
	`deleted_at` integer
);
--> statement-breakpoint
CREATE INDEX `member_portfolio_pictures_portfolio_idx` ON `member_portfolio_pictures` (`portfolio_id`,`position`);--> statement-breakpoint
CREATE TABLE `member_portfolio_projects` (
	`id` text PRIMARY KEY NOT NULL,
	`member_id` text NOT NULL,
	`title` text NOT NULL,
	`place` text,
	`property_type` text,
	`style` text,
	`description` text,
	`project_id` text,
	`position` integer DEFAULT 0 NOT NULL,
	`created_by` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`deleted_at` integer
);
--> statement-breakpoint
CREATE INDEX `member_portfolio_projects_member_idx` ON `member_portfolio_projects` (`member_id`,`position`);--> statement-breakpoint
ALTER TABLE `members` ADD `portal_years` integer;--> statement-breakpoint
ALTER TABLE `studio_invitations` ADD `hangout_event_id` text;