CREATE TABLE `quote_item_comments` (
	`id` text PRIMARY KEY NOT NULL,
	`quote_id` text NOT NULL,
	`item_id` text NOT NULL,
	`author_id` text NOT NULL,
	`body` text NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`quote_id`) REFERENCES `quotes`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`author_id`) REFERENCES `members`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `quote_item_comments_quote_idx` ON `quote_item_comments` (`quote_id`);--> statement-breakpoint
CREATE INDEX `quote_item_comments_item_idx` ON `quote_item_comments` (`item_id`);