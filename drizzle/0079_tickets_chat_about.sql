CREATE TABLE `chat_reads` (
	`reader_kind` text NOT NULL,
	`reader_id` text NOT NULL,
	`project_id` text NOT NULL,
	`read_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `chat_reads_uq` ON `chat_reads` (`reader_kind`,`reader_id`,`project_id`);--> statement-breakpoint
CREATE TABLE `project_messages` (
	`id` text PRIMARY KEY NOT NULL,
	`project_id` text NOT NULL,
	`lead_id` text NOT NULL,
	`author_kind` text NOT NULL,
	`author_id` text,
	`author_name` text NOT NULL,
	`body` text DEFAULT '' NOT NULL,
	`photos` text,
	`created_at` integer NOT NULL,
	`deleted_at` integer,
	FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `project_messages_project_idx` ON `project_messages` (`project_id`,`created_at`);--> statement-breakpoint
CREATE TABLE `project_tickets` (
	`id` text PRIMARY KEY NOT NULL,
	`project_id` text NOT NULL,
	`lead_id` text NOT NULL,
	`number` text NOT NULL,
	`category` text NOT NULL,
	`subject` text NOT NULL,
	`body` text DEFAULT '' NOT NULL,
	`photos` text,
	`status` text DEFAULT 'open' NOT NULL,
	`priority` text DEFAULT 'normal' NOT NULL,
	`assignee_id` text,
	`raised_kind` text NOT NULL,
	`raised_by_id` text,
	`raised_by_name` text NOT NULL,
	`escalated_at` integer,
	`escalated_by` text,
	`escalate_note` text,
	`resolved_at` integer,
	`resolved_by` text,
	`closed_at` integer,
	`closed_by` text,
	`last_client_at` integer,
	`last_studio_at` integer,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `project_tickets_number` ON `project_tickets` (`number`);--> statement-breakpoint
CREATE INDEX `project_tickets_project_idx` ON `project_tickets` (`project_id`,`created_at`);--> statement-breakpoint
CREATE TABLE `studio_pictures` (
	`id` text PRIMARY KEY NOT NULL,
	`kind` text NOT NULL,
	`member_id` text,
	`data` text NOT NULL,
	`caption` text,
	`position` integer DEFAULT 0 NOT NULL,
	`created_at` integer NOT NULL,
	`deleted_at` integer
);
--> statement-breakpoint
CREATE INDEX `studio_pictures_kind_idx` ON `studio_pictures` (`kind`,`position`);--> statement-breakpoint
CREATE TABLE `ticket_replies` (
	`id` text PRIMARY KEY NOT NULL,
	`ticket_id` text NOT NULL,
	`author_kind` text NOT NULL,
	`author_id` text,
	`author_name` text NOT NULL,
	`body` text DEFAULT '' NOT NULL,
	`photos` text,
	`internal` integer DEFAULT false NOT NULL,
	`event` text,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`ticket_id`) REFERENCES `project_tickets`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `ticket_replies_ticket_idx` ON `ticket_replies` (`ticket_id`,`created_at`);--> statement-breakpoint
ALTER TABLE `members` ADD `portal_shown` integer DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `members` ADD `portal_title` text;--> statement-breakpoint
ALTER TABLE `members` ADD `portal_bio` text;--> statement-breakpoint
ALTER TABLE `members` ADD `portal_photo_id` text;