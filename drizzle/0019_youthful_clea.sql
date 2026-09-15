ALTER TABLE `members` ADD `signature_kind` text;--> statement-breakpoint
ALTER TABLE `members` ADD `signature_name` text;--> statement-breakpoint
ALTER TABLE `members` ADD `signature_data` text;--> statement-breakpoint
ALTER TABLE `quotes` ADD `client_signature_required` integer DEFAULT true NOT NULL;