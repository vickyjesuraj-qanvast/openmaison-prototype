CREATE TABLE `project_milestone_extensions` (
	`id` text PRIMARY KEY NOT NULL,
	`project_id` text NOT NULL,
	`milestone_id` text NOT NULL,
	`from_end` integer NOT NULL,
	`to_end` integer NOT NULL,
	`reason` text NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`requested_by` text,
	`requested_at` integer NOT NULL,
	`answered_by` text,
	`answered_at` integer,
	`answer_note` text,
	`update_id` text,
	FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`milestone_id`) REFERENCES `project_milestones`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `project_milestone_extensions_project_idx` ON `project_milestone_extensions` (`project_id`,`status`);--> statement-breakpoint
CREATE TABLE `project_milestone_links` (
	`id` text PRIMARY KEY NOT NULL,
	`project_id` text NOT NULL,
	`milestone_id` text NOT NULL,
	`after_id` text NOT NULL,
	`gap_days` integer DEFAULT 1 NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`milestone_id`) REFERENCES `project_milestones`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`after_id`) REFERENCES `project_milestones`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `project_milestone_links_project_idx` ON `project_milestone_links` (`project_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `project_milestone_links_pair_uq` ON `project_milestone_links` (`milestone_id`,`after_id`);--> statement-breakpoint
CREATE TABLE `project_share_requests` (
	`id` text PRIMARY KEY NOT NULL,
	`project_id` text NOT NULL,
	`milestone_ids` text NOT NULL,
	`note` text,
	`status` text DEFAULT 'pending' NOT NULL,
	`requested_by` text,
	`requested_at` integer NOT NULL,
	`answered_by` text,
	`answered_at` integer,
	`answer_note` text,
	`share_id` text,
	FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `project_share_requests_project_idx` ON `project_share_requests` (`project_id`,`status`);--> statement-breakpoint
ALTER TABLE `lead_tasks` ADD `external_name` text;--> statement-breakpoint
ALTER TABLE `lead_tasks` ADD `external_phone` text;--> statement-breakpoint
ALTER TABLE `lead_tasks` ADD `external_kind` text;--> statement-breakpoint
ALTER TABLE `lead_tasks` ADD `external_sent_at` integer;--> statement-breakpoint
ALTER TABLE `project_milestones` ADD `description` text;--> statement-breakpoint
ALTER TABLE `project_milestones` ADD `color` text;--> statement-breakpoint
ALTER TABLE `project_milestones` ADD `started_at` integer;--> statement-breakpoint
ALTER TABLE `project_milestones` ADD `resolved_note` text;--> statement-breakpoint
ALTER TABLE `project_milestones` ADD `resolved_at` integer;--> statement-breakpoint
ALTER TABLE `project_milestones` ADD `resolved_by` text;--> statement-breakpoint
ALTER TABLE `project_milestones` ADD `done_asked_by` text;--> statement-breakpoint
ALTER TABLE `project_milestones` ADD `done_asked_at` integer;--> statement-breakpoint
ALTER TABLE `project_milestones` ADD `client_note` text;--> statement-breakpoint
ALTER TABLE `schedule_templates` ADD `preset_key` text;