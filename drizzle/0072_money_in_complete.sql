ALTER TABLE `project_invoices` ADD `kind` text DEFAULT 'stage' NOT NULL;--> statement-breakpoint
ALTER TABLE `project_invoices` ADD `variation_id` text;--> statement-breakpoint
ALTER TABLE `project_invoices` ADD `reason` text;--> statement-breakpoint
ALTER TABLE `project_invoices` ADD `description` text;--> statement-breakpoint
ALTER TABLE `project_invoices` ADD `client_note` text;--> statement-breakpoint
ALTER TABLE `project_invoices` ADD `lines_json` text;--> statement-breakpoint
ALTER TABLE `project_invoices` ADD `charge_gst` integer;--> statement-breakpoint
ALTER TABLE `project_invoices` ADD `due_mode` text;--> statement-breakpoint
ALTER TABLE `project_invoices` ADD `due_on` integer;--> statement-breakpoint
ALTER TABLE `project_invoices` ADD `external_ref` text;--> statement-breakpoint
ALTER TABLE `project_invoices` ADD `external_file_id` text;--> statement-breakpoint
ALTER TABLE `project_invoices` ADD `share_token` text;--> statement-breakpoint
ALTER TABLE `project_invoices` ADD `file_id` text;--> statement-breakpoint
ALTER TABLE `project_invoices` ADD `fixed_minor` integer;--> statement-breakpoint
CREATE UNIQUE INDEX `project_invoices_token_uq` ON `project_invoices` (`share_token`);--> statement-breakpoint
ALTER TABLE `project_payments` ADD `share_token` text;--> statement-breakpoint
CREATE UNIQUE INDEX `project_payments_token_uq` ON `project_payments` (`share_token`);--> statement-breakpoint
ALTER TABLE `quote_items` ADD `omits_id` text;--> statement-breakpoint
ALTER TABLE `quotes` ADD `change_reason` text;