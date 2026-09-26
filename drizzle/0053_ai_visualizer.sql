CREATE TABLE `project_rooms` (
	`id` text PRIMARY KEY NOT NULL,
	`design_id` text NOT NULL,
	`lead_id` text,
	`project_id` text,
	`name` text NOT NULL,
	`original_image_url` text,
	`sample_key` text,
	`source_file_id` text,
	`detection_json` text,
	`state_json` text,
	`position` integer DEFAULT 0 NOT NULL,
	`created_by` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`deleted_at` integer,
	FOREIGN KEY (`design_id`) REFERENCES `visualizer_designs`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `project_rooms_design_idx` ON `project_rooms` (`design_id`);--> statement-breakpoint
CREATE TABLE `render_annotations` (
	`id` text PRIMARY KEY NOT NULL,
	`job_id` text NOT NULL,
	`variant_id` integer NOT NULL,
	`x` real NOT NULL,
	`y` real NOT NULL,
	`body` text NOT NULL,
	`status` text DEFAULT 'open' NOT NULL,
	`author_role` text NOT NULL,
	`author_member_id` text,
	`author_name` text NOT NULL,
	`comments_json` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`deleted_at` integer,
	FOREIGN KEY (`job_id`) REFERENCES `render_jobs`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `render_annotations_job_idx` ON `render_annotations` (`job_id`);--> statement-breakpoint
CREATE TABLE `render_consultation_requests` (
	`id` text PRIMARY KEY NOT NULL,
	`share_link_id` text NOT NULL,
	`kind` text NOT NULL,
	`version_key` text,
	`client_name` text,
	`client_phone` text,
	`message` text,
	`task_id` text,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`share_link_id`) REFERENCES `render_share_links`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `render_consultation_link_idx` ON `render_consultation_requests` (`share_link_id`);--> statement-breakpoint
CREATE TABLE `render_jobs` (
	`id` text PRIMARY KEY NOT NULL,
	`room_id` text NOT NULL,
	`lead_id` text,
	`project_id` text,
	`model` text NOT NULL,
	`status` text DEFAULT 'completed' NOT NULL,
	`kind` text NOT NULL,
	`style` text,
	`variants_json` text NOT NULL,
	`created_by` text,
	`created_at` integer NOT NULL,
	`completed_at` integer,
	FOREIGN KEY (`room_id`) REFERENCES `project_rooms`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `render_jobs_room_idx` ON `render_jobs` (`room_id`);--> statement-breakpoint
CREATE TABLE `render_share_links` (
	`id` text PRIMARY KEY NOT NULL,
	`token` text NOT NULL,
	`design_id` text NOT NULL,
	`lead_id` text,
	`snapshot` text NOT NULL,
	`message` text,
	`expires_at` integer NOT NULL,
	`view_count` integer DEFAULT 0 NOT NULL,
	`last_viewed_at` integer,
	`sent_via` text,
	`created_by` text,
	`created_at` integer NOT NULL,
	`revoked_at` integer,
	FOREIGN KEY (`design_id`) REFERENCES `visualizer_designs`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `render_share_links_token_idx` ON `render_share_links` (`token`);--> statement-breakpoint
CREATE INDEX `render_share_links_design_idx` ON `render_share_links` (`design_id`);--> statement-breakpoint
CREATE TABLE `studio_materials` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`category` text NOT NULL,
	`image_url` text,
	`hex` text NOT NULL,
	`finish` text DEFAULT 'matte' NOT NULL,
	`description` text,
	`folder_id` text,
	`price_book_item_id` text,
	`uploaded_by` text,
	`is_active` integer DEFAULT true NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`deleted_at` integer
);
--> statement-breakpoint
CREATE TABLE `visualizer_designs` (
	`id` text PRIMARY KEY NOT NULL,
	`kind` text NOT NULL,
	`lead_id` text,
	`name` text NOT NULL,
	`folder_id` text,
	`custom_json` text,
	`created_by` text NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`deleted_at` integer,
	`deleted_by` text,
	FOREIGN KEY (`lead_id`) REFERENCES `leads`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `visualizer_designs_lead_idx` ON `visualizer_designs` (`lead_id`);