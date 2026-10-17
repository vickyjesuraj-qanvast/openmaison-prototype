CREATE TABLE `nudge_state` (
	`member_id` text PRIMARY KEY NOT NULL,
	`spent` text DEFAULT '{}' NOT NULL,
	`last_modal_at` integer,
	`last_proactive_at` integer,
	`t7_last_shown_at` integer,
	`last_evaluated_at` integer,
	`active_seconds` integer DEFAULT 0 NOT NULL,
	`version` integer DEFAULT 0 NOT NULL,
	`offer_id` text,
	`offer_json` text,
	`answers_json` text DEFAULT '{}' NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`member_id`) REFERENCES `members`(`id`) ON UPDATE no action ON DELETE cascade
);
