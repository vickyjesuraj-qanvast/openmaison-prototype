CREATE TABLE `price_book_changes` (
	`id` text PRIMARY KEY NOT NULL,
	`item_id` text NOT NULL,
	`kind` text NOT NULL,
	`changes` text,
	`note` text,
	`by` text,
	`at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `price_book_changes_item_idx` ON `price_book_changes` (`item_id`);--> statement-breakpoint
ALTER TABLE `price_book_items` ADD `status` text DEFAULT 'live' NOT NULL;--> statement-breakpoint
ALTER TABLE `price_book_items` ADD `created_by` text;--> statement-breakpoint
ALTER TABLE `price_book_items` ADD `updated_by` text;--> statement-breakpoint
ALTER TABLE `price_book_items` ADD `reviewed_by` text;--> statement-breakpoint
ALTER TABLE `price_book_items` ADD `reviewed_at` integer;--> statement-breakpoint
ALTER TABLE `price_book_items` ADD `review_note` text;--> statement-breakpoint
ALTER TABLE `price_book_sections` ADD `created_by` text;--> statement-breakpoint
ALTER TABLE `price_book_sections` ADD `updated_by` text;