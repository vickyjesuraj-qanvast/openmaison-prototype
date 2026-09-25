ALTER TABLE `contract_bundles` ADD `viewed_at` integer;--> statement-breakpoint
ALTER TABLE `contract_bundles` ADD `signing_hash` text;--> statement-breakpoint
ALTER TABLE `contract_bundles` ADD `signature_kind` text;--> statement-breakpoint
ALTER TABLE `contract_bundles` ADD `signature_data` text;--> statement-breakpoint
ALTER TABLE `contract_bundles` ADD `signer_phone` text;--> statement-breakpoint
ALTER TABLE `contract_bundles` ADD `signer_user_agent` text;--> statement-breakpoint
ALTER TABLE `contract_bundles` ADD `signer_timezone` text;--> statement-breakpoint
ALTER TABLE `contract_templates` ADD `requires_scroll` integer DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `contract_templates` ADD `requires_accept` integer DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `contract_templates` ADD `accept_label` text;--> statement-breakpoint
ALTER TABLE `contracts` ADD `requires_scroll` integer DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `contracts` ADD `requires_accept` integer DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `contracts` ADD `accept_label` text;--> statement-breakpoint
ALTER TABLE `contracts` ADD `viewed_at` integer;--> statement-breakpoint
ALTER TABLE `contracts` ADD `accepted_at` integer;--> statement-breakpoint
ALTER TABLE `contracts` ADD `signature_kind` text;--> statement-breakpoint
ALTER TABLE `contracts` ADD `signature_data` text;--> statement-breakpoint
ALTER TABLE `contracts` ADD `signer_phone` text;--> statement-breakpoint
ALTER TABLE `contracts` ADD `signer_user_agent` text;--> statement-breakpoint
ALTER TABLE `contracts` ADD `signer_timezone` text;--> statement-breakpoint
ALTER TABLE `contracts` ADD `verification_method` text;--> statement-breakpoint
ALTER TABLE `contracts` ADD `bundle_position` integer;