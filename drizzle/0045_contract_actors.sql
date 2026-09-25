ALTER TABLE `contract_templates` ADD `updated_by` text;--> statement-breakpoint
ALTER TABLE `contracts` ADD `sent_by` text;--> statement-breakpoint
ALTER TABLE `contracts` ADD `marked_by` text;--> statement-breakpoint
ALTER TABLE `contracts` ADD `deleted_by` text;--> statement-breakpoint
ALTER TABLE `lead_tasks` ADD `contract_id` text;