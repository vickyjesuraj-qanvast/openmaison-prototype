ALTER TABLE `quote_items` ADD `priced_after` integer DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `quote_items` ADD `name_html` text;--> statement-breakpoint
ALTER TABLE `quote_payments` ADD `fixed_label` text;--> statement-breakpoint
ALTER TABLE `quotes` ADD `remarks` text;