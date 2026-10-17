ALTER TABLE `quotes` ADD `confirm_token` text;--> statement-breakpoint
ALTER TABLE `quotes` ADD `client_viewed_at` integer;--> statement-breakpoint
ALTER TABLE `quotes` ADD `client_last_viewed_at` integer;--> statement-breakpoint
ALTER TABLE `quotes` ADD `client_view_count` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `quotes` ADD `prepared_json` text;--> statement-breakpoint
ALTER TABLE `quotes` ADD `draft_brief` text;--> statement-breakpoint
CREATE UNIQUE INDEX `quotes_confirm_token_idx` ON `quotes` (`confirm_token`);