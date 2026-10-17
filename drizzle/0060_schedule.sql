CREATE TABLE `project_milestones` (
	`id` text PRIMARY KEY NOT NULL,
	`project_id` text NOT NULL,
	`title` text NOT NULL,
	`position` integer DEFAULT 0 NOT NULL,
	`start_date` integer NOT NULL,
	`end_date` integer NOT NULL,
	`status` text DEFAULT 'not_started' NOT NULL,
	`follows_id` text,
	`gap_days` integer DEFAULT 1 NOT NULL,
	`payment_ref` text,
	`payment_due` text DEFAULT 'end' NOT NULL,
	`client_visible` integer DEFAULT true NOT NULL,
	`confirm_asked_at` integer,
	`confirm_answer` text,
	`confirm_note` text,
	`confirm_answered_at` integer,
	`waiting_on` text,
	`waiting_member_id` text,
	`waiting_name` text,
	`waiting_note` text,
	`waiting_since` integer,
	`waiting_until` integer,
	`plan_start_date` integer,
	`plan_end_date` integer,
	`done_at` integer,
	`created_by` text,
	`updated_by` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`deleted_at` integer,
	FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `project_milestones_project_idx` ON `project_milestones` (`project_id`,`position`);--> statement-breakpoint
CREATE TABLE `project_schedule_shares` (
	`id` text PRIMARY KEY NOT NULL,
	`project_id` text NOT NULL,
	`snapshot` text NOT NULL,
	`changes` text NOT NULL,
	`note` text,
	`shared_by` text,
	`shared_at` integer NOT NULL,
	FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `project_schedule_shares_project_idx` ON `project_schedule_shares` (`project_id`,`shared_at`);--> statement-breakpoint
CREATE TABLE `schedule_template_items` (
	`id` text PRIMARY KEY NOT NULL,
	`template_id` text NOT NULL,
	`position` integer DEFAULT 0 NOT NULL,
	`title` text NOT NULL,
	`days` integer DEFAULT 5 NOT NULL,
	`gap_days` integer DEFAULT 1 NOT NULL,
	`ask_confirm` integer DEFAULT false NOT NULL,
	FOREIGN KEY (`template_id`) REFERENCES `schedule_templates`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `schedule_template_items_template_idx` ON `schedule_template_items` (`template_id`,`position`);--> statement-breakpoint
CREATE TABLE `schedule_templates` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`created_by` text,
	`updated_by` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`deleted_at` integer,
	`folder_id` text
);
--> statement-breakpoint
ALTER TABLE `lead_tasks` ADD `milestone_id` text;