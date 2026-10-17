ALTER TABLE `quotes` ADD `view_token` text;--> statement-breakpoint
ALTER TABLE `quotes` ADD `view_token_at` integer;--> statement-breakpoint
ALTER TABLE `quotes` ADD `view_token_by` text;--> statement-breakpoint
CREATE UNIQUE INDEX `quotes_view_token_idx` ON `quotes` (`view_token`);--> statement-breakpoint
ALTER TABLE `render_share_links` ADD `file_id` text;--> statement-breakpoint
CREATE INDEX `render_share_links_file_idx` ON `render_share_links` (`file_id`);