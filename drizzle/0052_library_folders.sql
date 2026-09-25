CREATE TABLE `library_folders` (
	`id` text PRIMARY KEY NOT NULL,
	`library` text NOT NULL,
	`name` text NOT NULL,
	`parent_id` text,
	`created_by` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`deleted_at` integer
);
--> statement-breakpoint
CREATE INDEX `library_folders_library_idx` ON `library_folders` (`library`);--> statement-breakpoint
ALTER TABLE `contract_templates` ADD `folder_id` text;--> statement-breakpoint
ALTER TABLE `payment_templates` ADD `folder_id` text;--> statement-breakpoint
ALTER TABLE `price_book_items` ADD `folder_id` text;--> statement-breakpoint
ALTER TABLE `price_book_sections` ADD `folder_id` text;--> statement-breakpoint
ALTER TABLE `quote_templates` ADD `folder_id` text;--> statement-breakpoint
ALTER TABLE `quote_text_templates` ADD `folder_id` text;--> statement-breakpoint
ALTER TABLE `task_templates` ADD `folder_id` text;