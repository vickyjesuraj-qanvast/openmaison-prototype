CREATE TABLE `floor_plan_comments` (
	`id` text PRIMARY KEY NOT NULL,
	`mark_id` text NOT NULL,
	`body` text DEFAULT '' NOT NULL,
	`photos` text,
	`author_kind` text NOT NULL,
	`author_id` text,
	`author_name` text NOT NULL,
	`created_at` integer NOT NULL,
	`deleted_at` integer,
	FOREIGN KEY (`mark_id`) REFERENCES `floor_plan_marks`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `floor_plan_comments_mark_idx` ON `floor_plan_comments` (`mark_id`,`created_at`);--> statement-breakpoint
CREATE TABLE `floor_plan_confirmations` (
	`id` text PRIMARY KEY NOT NULL,
	`plan_id` text NOT NULL,
	`project_id` text NOT NULL,
	`homeowner_id` text,
	`name` text NOT NULL,
	`phone` text,
	`note` text,
	`method` text DEFAULT 'portal' NOT NULL,
	`marks_at` integer,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`plan_id`) REFERENCES `project_floor_plans`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `floor_plan_confirmations_project_idx` ON `floor_plan_confirmations` (`project_id`,`created_at`);--> statement-breakpoint
CREATE TABLE `floor_plan_marks` (
	`id` text PRIMARY KEY NOT NULL,
	`plan_id` text NOT NULL,
	`project_id` text NOT NULL,
	`tool` text NOT NULL,
	`shape` text NOT NULL,
	`layer` text DEFAULT 'general' NOT NULL,
	`author_kind` text NOT NULL,
	`author_id` text,
	`author_name` text NOT NULL,
	`status` text DEFAULT 'open' NOT NULL,
	`resolved_at` integer,
	`resolved_by` text,
	`task_id` text,
	`variation_id` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`deleted_at` integer,
	`deleted_by` text,
	FOREIGN KEY (`plan_id`) REFERENCES `project_floor_plans`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `floor_plan_marks_plan_idx` ON `floor_plan_marks` (`plan_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `floor_plan_marks_project_idx` ON `floor_plan_marks` (`project_id`);--> statement-breakpoint
CREATE TABLE `floor_plan_pictures` (
	`plan_id` text PRIMARY KEY NOT NULL,
	`data` text NOT NULL,
	FOREIGN KEY (`plan_id`) REFERENCES `project_floor_plans`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `floor_plan_seen` (
	`link_id` text PRIMARY KEY NOT NULL,
	`seen_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `project_floor_plans` (
	`id` text PRIMARY KEY NOT NULL,
	`project_id` text NOT NULL,
	`lead_id` text NOT NULL,
	`name` text NOT NULL,
	`file_id` text,
	`width` integer NOT NULL,
	`height` integer NOT NULL,
	`is_main` integer DEFAULT false NOT NULL,
	`scale_mm_per_px` real,
	`scale_set_by` text,
	`scale_set_at` integer,
	`added_by_kind` text DEFAULT 'studio' NOT NULL,
	`added_by` text,
	`added_by_name` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`put_away_at` integer,
	`put_away_by` text,
	FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `project_floor_plans_project_idx` ON `project_floor_plans` (`project_id`,`created_at`);