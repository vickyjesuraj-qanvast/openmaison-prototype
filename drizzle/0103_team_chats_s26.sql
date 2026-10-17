CREATE TABLE `conversation_files` (
	`id` text PRIMARY KEY NOT NULL,
	`conversation_id` text NOT NULL,
	`name` text NOT NULL,
	`mime` text,
	`size_bytes` integer,
	`created_by` text,
	`created_at` integer NOT NULL,
	`data` text NOT NULL,
	FOREIGN KEY (`conversation_id`) REFERENCES `conversations`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `conversation_files_conv_idx` ON `conversation_files` (`conversation_id`);--> statement-breakpoint
CREATE TABLE `conversation_messages` (
	`id` text PRIMARY KEY NOT NULL,
	`conversation_id` text NOT NULL,
	`author_id` text,
	`author_name` text NOT NULL,
	`body` text DEFAULT '' NOT NULL,
	`attachments` text,
	`event` text,
	`meta` text,
	`created_at` integer NOT NULL,
	`deleted_at` integer,
	FOREIGN KEY (`conversation_id`) REFERENCES `conversations`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `conversation_messages_conv_idx` ON `conversation_messages` (`conversation_id`,`created_at`);--> statement-breakpoint
CREATE TABLE `conversation_participants` (
	`conversation_id` text NOT NULL,
	`member_id` text NOT NULL,
	`added_by` text,
	`added_at` integer NOT NULL,
	`removed_at` integer,
	`removed_by` text,
	FOREIGN KEY (`conversation_id`) REFERENCES `conversations`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `conversation_participants_uq` ON `conversation_participants` (`conversation_id`,`member_id`);--> statement-breakpoint
CREATE INDEX `conversation_participants_member_idx` ON `conversation_participants` (`member_id`);--> statement-breakpoint
CREATE TABLE `conversations` (
	`id` text PRIMARY KEY NOT NULL,
	`kind` text NOT NULL,
	`name` text,
	`lead_id` text,
	`pair_key` text,
	`created_by` text,
	`created_at` integer NOT NULL,
	`last_message_at` integer
);
--> statement-breakpoint
CREATE UNIQUE INDEX `conversations_lead_uq` ON `conversations` (`lead_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `conversations_pair_uq` ON `conversations` (`pair_key`);