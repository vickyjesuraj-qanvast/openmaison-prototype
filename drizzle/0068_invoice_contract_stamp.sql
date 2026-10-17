ALTER TABLE `project_invoices` ADD `contract_minor` integer;--> statement-breakpoint
ALTER TABLE `project_invoices` ADD `base_minor` integer;--> statement-breakpoint
ALTER TABLE `project_invoices` ADD `variations_minor` integer;--> statement-breakpoint
ALTER TABLE `quotes` ADD `change_asked_at` integer;--> statement-breakpoint
ALTER TABLE `quotes` ADD `change_asked_note` text;