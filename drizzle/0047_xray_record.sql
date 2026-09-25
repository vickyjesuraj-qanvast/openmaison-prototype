ALTER TABLE `quote_comparisons` ADD `overrides_json` text;--> statement-breakpoint
ALTER TABLE `quote_comparisons` ADD `corrected_by` text;--> statement-breakpoint
ALTER TABLE `quote_comparisons` ADD `corrected_at` integer;--> statement-breakpoint
ALTER TABLE `quote_comparisons` ADD `sent_at` integer;--> statement-breakpoint
ALTER TABLE `quote_comparisons` ADD `sent_by` text;--> statement-breakpoint
ALTER TABLE `quote_comparisons` ADD `sent_text` text;--> statement-breakpoint
ALTER TABLE `quote_comparisons` ADD `sent_via` text;