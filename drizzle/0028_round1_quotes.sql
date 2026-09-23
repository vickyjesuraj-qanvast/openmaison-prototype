CREATE TABLE `price_book_sections` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`description` text,
	`lines_json` text NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer,
	`last_used_at` integer
);
--> statement-breakpoint
CREATE TABLE `quote_versions` (
	`id` text PRIMARY KEY NOT NULL,
	`quote_id` text NOT NULL,
	`version` integer NOT NULL,
	`snapshot_json` text NOT NULL,
	`note` text,
	`created_by` text,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`quote_id`) REFERENCES `quotes`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `quote_versions_quote_idx` ON `quote_versions` (`quote_id`);--> statement-breakpoint
ALTER TABLE `contracts` ADD `signed_nric` text;--> statement-breakpoint
ALTER TABLE `members` ADD `email` text;--> statement-breakpoint
ALTER TABLE `quote_items` ADD `print_as` text;--> statement-breakpoint
ALTER TABLE `quote_items` ADD `print_as_text` text;--> statement-breakpoint
ALTER TABLE `quote_items` ADD `highlight` text;--> statement-breakpoint
ALTER TABLE `quote_items` ADD `no_number` integer DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `quote_items` ADD `description_html` text;--> statement-breakpoint
ALTER TABLE `quotes` ADD `discounts_json` text;--> statement-breakpoint
ALTER TABLE `quotes` ADD `revised_at` integer;