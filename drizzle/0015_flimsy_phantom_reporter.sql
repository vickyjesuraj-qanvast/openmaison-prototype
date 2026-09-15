CREATE TABLE `price_book_items` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`description` text,
	`kind` text DEFAULT 'purchase' NOT NULL,
	`unit` text DEFAULT 'Pieces' NOT NULL,
	`cost_minor` integer DEFAULT 0 NOT NULL,
	`markup_minor` integer DEFAULT 0 NOT NULL,
	`category` text,
	`thumb` text,
	`created_at` integer NOT NULL,
	`updated_at` integer
);
--> statement-breakpoint
CREATE TABLE `quote_items` (
	`id` text PRIMARY KEY NOT NULL,
	`quote_id` text NOT NULL,
	`parent_id` text,
	`kind` text DEFAULT 'item' NOT NULL,
	`position` integer DEFAULT 0 NOT NULL,
	`name` text NOT NULL,
	`description` text,
	`thumb` text,
	`thumb_count` integer DEFAULT 0 NOT NULL,
	`icon` text,
	`status` text DEFAULT 'Pending' NOT NULL,
	`qty` real DEFAULT 1 NOT NULL,
	`unit` text,
	`cost_minor` integer DEFAULT 0 NOT NULL,
	`markup_minor` integer DEFAULT 0 NOT NULL,
	`discount_pct` real DEFAULT 0 NOT NULL,
	`gst_pct` real DEFAULT 9 NOT NULL,
	`room` text,
	`category` text,
	`section` text,
	`visibility` text DEFAULT 'visible' NOT NULL,
	`collapsed` integer DEFAULT false NOT NULL,
	`price_book_item_id` text,
	`created_at` integer NOT NULL,
	`updated_at` integer,
	FOREIGN KEY (`quote_id`) REFERENCES `quotes`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `quote_items_quote_idx` ON `quote_items` (`quote_id`);--> statement-breakpoint
ALTER TABLE `quotes` ADD `additional_discount_mode` text DEFAULT 'pct' NOT NULL;--> statement-breakpoint
ALTER TABLE `quotes` ADD `additional_discount_value` real DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `quotes` ADD `gst_enabled` integer DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE `quotes` ADD `issuing_entity` text;--> statement-breakpoint
ALTER TABLE `quotes` ADD `items_view` text DEFAULT 'none' NOT NULL;--> statement-breakpoint
ALTER TABLE `quotes` ADD `items_density` text DEFAULT 'single' NOT NULL;--> statement-breakpoint
ALTER TABLE `quotes` ADD `items_columns` text;--> statement-breakpoint
ALTER TABLE `quotes` ADD `items_labels` text;