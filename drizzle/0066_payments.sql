CREATE TABLE `project_payments` (
	`id` text PRIMARY KEY NOT NULL,
	`project_id` text NOT NULL,
	`invoice_id` text NOT NULL,
	`amount_minor` integer NOT NULL,
	`paid_on` integer NOT NULL,
	`method` text NOT NULL,
	`reference` text,
	`note` text,
	`proof_file_id` text,
	`source` text NOT NULL,
	`status` text NOT NULL,
	`trusted` integer DEFAULT false NOT NULL,
	`recorded_by` text,
	`submitted_by` text,
	`confirmed_by` text,
	`confirmed_at` integer,
	`receipt_number` text,
	`receipt_file_id` text,
	`rejected_by` text,
	`rejected_at` integer,
	`reject_reason` text,
	`reversed_by` text,
	`reversed_at` integer,
	`reverse_reason` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`invoice_id`) REFERENCES `project_invoices`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `project_payments_project_idx` ON `project_payments` (`project_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `project_payments_invoice_idx` ON `project_payments` (`invoice_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `project_payments_receipt_uq` ON `project_payments` (`receipt_number`);--> statement-breakpoint
ALTER TABLE `quotes` ADD `selection_id` text;