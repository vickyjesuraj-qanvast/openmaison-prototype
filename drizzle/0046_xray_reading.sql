ALTER TABLE `quote_comparisons` ADD `inputs_json` text;--> statement-breakpoint
ALTER TABLE `quote_comparisons` ADD `engine` integer;--> statement-breakpoint
ALTER TABLE `quote_comparisons` ADD `your_file` text;--> statement-breakpoint
CREATE INDEX `quote_comparisons_lead_idx` ON `quote_comparisons` (`lead_id`);