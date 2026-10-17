CREATE TABLE `kept_line_costs` (
	`line_id` text PRIMARY KEY NOT NULL,
	`quote_id` text NOT NULL,
	`cost_minor` integer DEFAULT 0 NOT NULL,
	`markup_minor` integer DEFAULT 0 NOT NULL,
	`rebate_minor` integer DEFAULT 0 NOT NULL,
	`kept_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `kept_line_costs_quote_idx` ON `kept_line_costs` (`quote_id`);