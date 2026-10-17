CREATE TABLE `inbound_messages` (
	`id` text PRIMARY KEY NOT NULL,
	`provider` text NOT NULL,
	`provider_ref` text NOT NULL,
	`channel` text NOT NULL,
	`from_address` text NOT NULL,
	`body` text,
	`kind` text NOT NULL,
	`reply_to` text,
	`status` text NOT NULL,
	`lead_id` text,
	`message_id` text,
	`received_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `inbound_messages_ref_uq` ON `inbound_messages` (`provider_ref`);--> statement-breakpoint
CREATE INDEX `inbound_messages_received_idx` ON `inbound_messages` (`received_at`);--> statement-breakpoint
ALTER TABLE `billing_checkout_sessions` ADD `trial` integer DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `notification_outbox` ADD `provider_ref` text;--> statement-breakpoint
ALTER TABLE `notification_outbox` ADD `delivered_at` integer;--> statement-breakpoint
ALTER TABLE `notification_outbox` ADD `read_at` integer;--> statement-breakpoint
CREATE INDEX `notification_outbox_provider_ref_idx` ON `notification_outbox` (`provider_ref`);