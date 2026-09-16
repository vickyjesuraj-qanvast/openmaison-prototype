ALTER TABLE `lead_tasks` ADD `quote_id` text REFERENCES quotes(id);--> statement-breakpoint
ALTER TABLE `quotes` ADD `created_by` text;