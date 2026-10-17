CREATE TABLE `conversation_prefs` (
	`member_id` text NOT NULL,
	`conversation` text NOT NULL,
	`pinned_at` integer,
	`muted_at` integer
);
--> statement-breakpoint
CREATE UNIQUE INDEX `conversation_prefs_uq` ON `conversation_prefs` (`member_id`,`conversation`);--> statement-breakpoint
CREATE TABLE `lead_messages` (
	`id` text PRIMARY KEY NOT NULL,
	`lead_id` text NOT NULL,
	`author_kind` text NOT NULL,
	`author_id` text,
	`author_name` text NOT NULL,
	`body` text DEFAULT '' NOT NULL,
	`attachments` text,
	`created_at` integer NOT NULL,
	`deleted_at` integer
);
--> statement-breakpoint
CREATE INDEX `lead_messages_lead_idx` ON `lead_messages` (`lead_id`,`created_at`);--> statement-breakpoint
CREATE TABLE `space_layout_versions` (
	`id` text PRIMARY KEY NOT NULL,
	`layout_id` text NOT NULL,
	`rev` integer NOT NULL,
	`name` text NOT NULL,
	`plan` text NOT NULL,
	`note` text,
	`created_by` text,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`layout_id`) REFERENCES `space_layouts`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `space_layout_versions_layout_idx` ON `space_layout_versions` (`layout_id`,`created_at`);--> statement-breakpoint
ALTER TABLE `commission_rules` ADD `stages_json` text;--> statement-breakpoint
ALTER TABLE `expenses` ADD `issuing_entity` text;--> statement-breakpoint
ALTER TABLE `notification_outbox` ADD `attempts` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `notification_outbox` ADD `next_try_at` integer;--> statement-breakpoint
ALTER TABLE `project_messages` ADD `channel` text DEFAULT 'client' NOT NULL;--> statement-breakpoint
ALTER TABLE `project_messages` ADD `attachments` text;--> statement-breakpoint
ALTER TABLE `project_messages` ADD `meta` text;--> statement-breakpoint
ALTER TABLE `project_milestones` ADD `resume_on` integer;--> statement-breakpoint
ALTER TABLE `projects` ADD `floor_plan_asked_at` integer;--> statement-breakpoint
ALTER TABLE `projects` ADD `floor_plan_asked_by` text;--> statement-breakpoint
ALTER TABLE `purchase_orders` ADD `bill_to` text;--> statement-breakpoint
ALTER TABLE `purchase_orders` ADD `delivered_at` integer;--> statement-breakpoint
ALTER TABLE `purchase_orders` ADD `delivered_by` text;--> statement-breakpoint
ALTER TABLE `purchase_orders` ADD `external` integer DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `purchase_orders` ADD `external_ref` text;--> statement-breakpoint
ALTER TABLE `purchase_orders` ADD `external_file_id` text;--> statement-breakpoint
ALTER TABLE `quote_payments` ADD `fixed_minor` integer;--> statement-breakpoint
ALTER TABLE `quotes` ADD `timeline_days` integer;--> statement-breakpoint
ALTER TABLE `schedule_template_items` ADD `description` text;--> statement-breakpoint
ALTER TABLE `schedule_template_items` ADD `color` text;--> statement-breakpoint
ALTER TABLE `schedule_template_items` ADD `follows_json` text;--> statement-breakpoint
ALTER TABLE `space_layouts` ADD `is_template` integer DEFAULT false NOT NULL;