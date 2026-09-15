ALTER TABLE `quotes` ADD `prepared_by` text;--> statement-breakpoint
ALTER TABLE `quotes` ADD `valid_until` integer;--> statement-breakpoint
ALTER TABLE `quotes` ADD `project_ref` text;--> statement-breakpoint
ALTER TABLE `quotes` ADD `nric` text;--> statement-breakpoint
ALTER TABLE `quotes` ADD `customer_id` text;--> statement-breakpoint
ALTER TABLE `quotes` ADD `property_type` text;--> statement-breakpoint
ALTER TABLE `quotes` ADD `site_address` text;--> statement-breakpoint
ALTER TABLE `quotes` ADD `version` integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE `quotes` ADD `sections` text;