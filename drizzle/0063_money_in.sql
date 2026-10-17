CREATE TABLE `project_invoices` (
	`id` text PRIMARY KEY NOT NULL,
	`project_id` text NOT NULL,
	`stage_ref` text NOT NULL,
	`stage_name` text NOT NULL,
	`pct` real DEFAULT 0 NOT NULL,
	`position` integer DEFAULT 0 NOT NULL,
	`number` text,
	`status` text DEFAULT 'draft' NOT NULL,
	`amount_minor` integer DEFAULT 0 NOT NULL,
	`gst_minor` integer DEFAULT 0 NOT NULL,
	`issuing_entity` text,
	`variance_reason` text,
	`edited_by` text,
	`edited_at` integer,
	`submitted_by` text,
	`submitted_at` integer,
	`review_note` text,
	`reviewed_by` text,
	`reviewed_at` integer,
	`sent_by` text,
	`sent_at` integer,
	`due_at` integer,
	`void_reason` text,
	`voided_by` text,
	`voided_at` integer,
	`replaces_id` text,
	`created_by` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `project_invoices_project_idx` ON `project_invoices` (`project_id`,`position`);--> statement-breakpoint
CREATE UNIQUE INDEX `project_invoices_number_uq` ON `project_invoices` (`number`);--> statement-breakpoint
ALTER TABLE `quotes` ADD `kind` text DEFAULT 'quote' NOT NULL;--> statement-breakpoint
ALTER TABLE `quotes` ADD `project_id` text;--> statement-breakpoint
ALTER TABLE `quotes` ADD `confirmed_via` text;--> statement-breakpoint
ALTER TABLE `quotes` ADD `confirmed_marked_by` text;