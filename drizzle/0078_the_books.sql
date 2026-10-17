CREATE TABLE `commission_payouts` (
	`id` text PRIMARY KEY NOT NULL,
	`member_id` text NOT NULL,
	`project_id` text NOT NULL,
	`amount_minor` integer NOT NULL,
	`paid_on` integer NOT NULL,
	`method` text NOT NULL,
	`reference` text,
	`note` text,
	`created_by` text,
	`created_at` integer NOT NULL,
	`reversed_by` text,
	`reversed_at` integer,
	`reverse_reason` text,
	FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `commission_payouts_member_idx` ON `commission_payouts` (`member_id`);--> statement-breakpoint
CREATE INDEX `commission_payouts_project_idx` ON `commission_payouts` (`project_id`);--> statement-breakpoint
CREATE TABLE `commission_requests` (
	`id` text PRIMARY KEY NOT NULL,
	`project_id` text NOT NULL,
	`member_id` text NOT NULL,
	`basis` text NOT NULL,
	`rate_bp` integer DEFAULT 0 NOT NULL,
	`fixed_minor` integer DEFAULT 0 NOT NULL,
	`reason` text NOT NULL,
	`status` text DEFAULT 'open' NOT NULL,
	`answered_by` text,
	`answered_at` integer,
	`answer_note` text,
	`approved_rate_bp` integer,
	`approved_fixed_minor` integer,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `commission_requests_member_idx` ON `commission_requests` (`member_id`,`status`);--> statement-breakpoint
CREATE TABLE `commission_rules` (
	`id` text PRIMARY KEY NOT NULL,
	`member_id` text,
	`project_id` text,
	`basis` text NOT NULL,
	`rate_bp` integer DEFAULT 0 NOT NULL,
	`fixed_minor` integer DEFAULT 0 NOT NULL,
	`from_day` integer NOT NULL,
	`ended_at` integer,
	`ended_by` text,
	`request_id` text,
	`created_by` text,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `commission_rules_scope_idx` ON `commission_rules` (`project_id`,`member_id`);--> statement-breakpoint
CREATE TABLE `commission_shares` (
	`id` text PRIMARY KEY NOT NULL,
	`project_id` text NOT NULL,
	`member_id` text NOT NULL,
	`share_bp` integer NOT NULL,
	`updated_by` text,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `commission_shares_uq` ON `commission_shares` (`project_id`,`member_id`);--> statement-breakpoint
CREATE TABLE `credit_notes` (
	`id` text PRIMARY KEY NOT NULL,
	`project_id` text NOT NULL,
	`invoice_id` text NOT NULL,
	`number` text NOT NULL,
	`reason` text NOT NULL,
	`amount_minor` integer NOT NULL,
	`gst_minor` integer DEFAULT 0 NOT NULL,
	`status` text DEFAULT 'issued' NOT NULL,
	`issued_by` text,
	`issued_at` integer NOT NULL,
	`void_reason` text,
	`voided_by` text,
	`voided_at` integer,
	`refund_minor` integer,
	`refunded_on` integer,
	`refund_method` text,
	`refund_reference` text,
	`refunded_by` text,
	`file_id` text,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`invoice_id`) REFERENCES `project_invoices`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `credit_notes_project_idx` ON `credit_notes` (`project_id`);--> statement-breakpoint
CREATE INDEX `credit_notes_invoice_idx` ON `credit_notes` (`invoice_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `credit_notes_number_uq` ON `credit_notes` (`number`);--> statement-breakpoint
CREATE TABLE `xero_links` (
	`id` text PRIMARY KEY NOT NULL,
	`record_kind` text NOT NULL,
	`record_id` text NOT NULL,
	`organisation` text NOT NULL,
	`remote_id` text,
	`hash` text,
	`status` text NOT NULL,
	`error` text,
	`attempts` integer DEFAULT 0 NOT NULL,
	`pushed_at` integer,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `xero_links_record_uq` ON `xero_links` (`record_kind`,`record_id`);--> statement-breakpoint
CREATE TABLE `xero_sync_log` (
	`id` text PRIMARY KEY NOT NULL,
	`run_id` text NOT NULL,
	`record_kind` text NOT NULL,
	`record_id` text NOT NULL,
	`label` text NOT NULL,
	`amount_minor` integer,
	`outcome` text NOT NULL,
	`message` text,
	`by` text,
	`at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `xero_sync_log_at_idx` ON `xero_sync_log` (`at`);