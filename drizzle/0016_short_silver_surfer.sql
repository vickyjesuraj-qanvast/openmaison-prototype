CREATE TABLE `quote_payments` (
	`id` text PRIMARY KEY NOT NULL,
	`quote_id` text NOT NULL,
	`position` integer DEFAULT 0 NOT NULL,
	`name` text NOT NULL,
	`description` text,
	`pct` real DEFAULT 0 NOT NULL,
	`due_kind` text DEFAULT 'estimate' NOT NULL,
	`due_at` integer,
	`created_at` integer NOT NULL,
	`updated_at` integer,
	FOREIGN KEY (`quote_id`) REFERENCES `quotes`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `quote_payments_quote_idx` ON `quote_payments` (`quote_id`);