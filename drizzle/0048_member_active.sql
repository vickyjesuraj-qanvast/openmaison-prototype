ALTER TABLE `members` ADD `is_active` integer DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE `members` ADD `deactivated_at` integer;--> statement-breakpoint
ALTER TABLE `members` ADD `phone` text;