CREATE TABLE `contract_bundles` (
	`id` text PRIMARY KEY NOT NULL,
	`lead_id` text NOT NULL,
	`recipient_name` text,
	`recipient_phone` text,
	`created_at` integer NOT NULL,
	`sent_at` integer,
	`signed_at` integer,
	`signed_by` text,
	`signed_nric` text,
	`created_by` text,
	FOREIGN KEY (`lead_id`) REFERENCES `leads`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
ALTER TABLE `contracts` ADD `bundle_id` text;--> statement-breakpoint
ALTER TABLE `price_book_items` ADD `vendor` text;--> statement-breakpoint
ALTER TABLE `quote_items` ADD `print_one_line` integer DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `quote_items` ADD `rebate_minor` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `quotes` ADD `confirmed_at` integer;--> statement-breakpoint
ALTER TABLE `quotes` ADD `confirmed_by` text;--> statement-breakpoint
ALTER TABLE `quotes` ADD `client2_name` text;--> statement-breakpoint
ALTER TABLE `quotes` ADD `client2_nric` text;