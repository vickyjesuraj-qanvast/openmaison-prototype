CREATE TABLE `project_selection_options` (
	`id` text PRIMARY KEY NOT NULL,
	`selection_id` text NOT NULL,
	`name` text NOT NULL,
	`description` text,
	`file_id` text,
	`hex` text,
	`price_minor` integer,
	`source` text DEFAULT 'upload' NOT NULL,
	`source_ref` text,
	`position` integer DEFAULT 0 NOT NULL,
	`created_by` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`deleted_at` integer,
	FOREIGN KEY (`selection_id`) REFERENCES `project_selections`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`file_id`) REFERENCES `lead_files`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `project_selection_options_selection_idx` ON `project_selection_options` (`selection_id`,`position`);--> statement-breakpoint
CREATE INDEX `project_selection_options_file_idx` ON `project_selection_options` (`file_id`);--> statement-breakpoint
CREATE TABLE `project_selections` (
	`id` text PRIMARY KEY NOT NULL,
	`project_id` text NOT NULL,
	`title` text NOT NULL,
	`room` text,
	`milestone_id` text,
	`needed_by` integer,
	`note` text,
	`status` text DEFAULT 'draft' NOT NULL,
	`chosen_option_id` text,
	`chosen_by` text,
	`chosen_member_id` text,
	`chosen_at` integer,
	`chosen_note` text,
	`created_by` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`shared_by` text,
	`shared_at` integer,
	`deleted_at` integer,
	`deleted_by` text,
	FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `project_selections_project_idx` ON `project_selections` (`project_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `project_selections_status_idx` ON `project_selections` (`status`);