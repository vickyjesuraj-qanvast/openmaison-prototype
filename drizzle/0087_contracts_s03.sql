CREATE TABLE `contract_template_files` (
	`template_id` text PRIMARY KEY NOT NULL,
	`data` text NOT NULL,
	`thumb` text,
	FOREIGN KEY (`template_id`) REFERENCES `contract_templates`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
ALTER TABLE `contract_bundles` ADD `sign_expires_at` integer;--> statement-breakpoint
ALTER TABLE `contract_bundles` ADD `cancelled_at` integer;--> statement-breakpoint
ALTER TABLE `contract_bundles` ADD `sign_token` text;--> statement-breakpoint
CREATE UNIQUE INDEX `contract_bundles_sign_token_idx` ON `contract_bundles` (`sign_token`);--> statement-breakpoint
ALTER TABLE `contract_templates` ADD `kind` text DEFAULT 'document' NOT NULL;--> statement-breakpoint
ALTER TABLE `contract_templates` ADD `file_name` text;--> statement-breakpoint
ALTER TABLE `contract_templates` ADD `file_size` integer;--> statement-breakpoint
ALTER TABLE `contracts` ADD `sign_token` text;--> statement-breakpoint
ALTER TABLE `contracts` ADD `sign_expires_at` integer;--> statement-breakpoint
ALTER TABLE `contracts` ADD `file_id` text;--> statement-breakpoint
ALTER TABLE `contracts` ADD `signed_file_id` text;--> statement-breakpoint
CREATE UNIQUE INDEX `contracts_sign_token_idx` ON `contracts` (`sign_token`);--> statement-breakpoint
ALTER TABLE `members` ADD `signature_consent` text;--> statement-breakpoint
ALTER TABLE `members` ADD `signature_consent_at` integer;--> statement-breakpoint
ALTER TABLE `quotes` ADD `signed_amount_minor` integer;