CREATE TABLE `copilot_objection_log` (
	`id` text PRIMARY KEY NOT NULL,
	`meeting_id` text NOT NULL,
	`lead_id` text NOT NULL,
	`member_id` text,
	`objection_type` text NOT NULL,
	`objection_description` text NOT NULL,
	`competitor_name` text,
	`recommended_response` text,
	`detected_at` integer NOT NULL,
	FOREIGN KEY (`meeting_id`) REFERENCES `meetings`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `copilot_objection_log_meeting_idx` ON `copilot_objection_log` (`meeting_id`);--> statement-breakpoint
CREATE TABLE `meetings` (
	`id` text PRIMARY KEY NOT NULL,
	`lead_id` text NOT NULL,
	`project_id` text,
	`aim` text DEFAULT 'first_consultation' NOT NULL,
	`aim_note` text,
	`where_kind` text DEFAULT 'In person' NOT NULL,
	`place` text,
	`starts_at` integer NOT NULL,
	`ends_at` integer,
	`status` text DEFAULT 'planned' NOT NULL,
	`member_ids` text DEFAULT '[]' NOT NULL,
	`consent_kind` text,
	`consent_at` integer,
	`consent_by` text,
	`disclosure_text` text,
	`started_at` integer,
	`started_by` text,
	`ended_at` integer,
	`blocks` integer DEFAULT 0 NOT NULL,
	`free_blocks` integer DEFAULT 0 NOT NULL,
	`paused_at` integer,
	`source` text,
	`notes` text DEFAULT '' NOT NULL,
	`recording_file_id` text,
	`file_ids` text DEFAULT '[]' NOT NULL,
	`state_json` text DEFAULT '{}' NOT NULL,
	`brief_json` text,
	`brief_at` integer,
	`brief_saved_at` integer,
	`brief_saved_by` text,
	`quote_id` text,
	`client_token` text,
	`client_token_at` integer,
	`invited_at` integer,
	`invited_via` text,
	`client_answer` text,
	`client_answer_at` integer,
	`client_answer_note` text,
	`client_viewed_at` integer,
	`shared_at` integer,
	`share_stopped_at` integer,
	`share_json` text,
	`created_by` text,
	`created_at` integer NOT NULL,
	`updated_at` integer,
	`deleted_at` integer,
	`deleted_by` text,
	FOREIGN KEY (`lead_id`) REFERENCES `leads`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `meetings_lead_idx` ON `meetings` (`lead_id`);--> statement-breakpoint
CREATE INDEX `meetings_starts_idx` ON `meetings` (`starts_at`);--> statement-breakpoint
CREATE UNIQUE INDEX `meetings_client_token_uq` ON `meetings` (`client_token`);--> statement-breakpoint
CREATE TABLE `studio_checklist_items` (
	`id` text PRIMARY KEY NOT NULL,
	`label` text NOT NULL,
	`category` text DEFAULT 'important' NOT NULL,
	`objective_types` text DEFAULT '[]' NOT NULL,
	`detection_keywords` text DEFAULT '[]' NOT NULL,
	`sort_order` integer DEFAULT 0 NOT NULL,
	`created_by` text,
	`created_at` integer NOT NULL,
	`updated_at` integer,
	`deleted_at` integer
);
--> statement-breakpoint
CREATE TABLE `studio_competitor_list` (
	`id` text PRIMARY KEY NOT NULL,
	`competitor_name` text NOT NULL,
	`notes` text,
	`created_by` text,
	`created_at` integer NOT NULL,
	`updated_at` integer,
	`deleted_at` integer
);
--> statement-breakpoint
CREATE TABLE `studio_objection_responses` (
	`id` text PRIMARY KEY NOT NULL,
	`default_key` text,
	`objection_type` text NOT NULL,
	`objection_title` text NOT NULL,
	`objection_description` text,
	`recommended_response` text NOT NULL,
	`is_active` integer DEFAULT true NOT NULL,
	`sort_order` integer DEFAULT 0 NOT NULL,
	`created_by` text,
	`created_at` integer NOT NULL,
	`updated_at` integer,
	`updated_by` text,
	`deleted_at` integer
);
--> statement-breakpoint
ALTER TABLE `lead_tasks` ADD `meeting_id` text;