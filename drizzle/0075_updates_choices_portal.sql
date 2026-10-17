CREATE TABLE `question_answer_history` (
	`id` text PRIMARY KEY NOT NULL,
	`lead_id` text NOT NULL,
	`question_id` text NOT NULL,
	`before` text,
	`after` text,
	`by_kind` text NOT NULL,
	`by_member_id` text,
	`by_homeowner_id` text,
	`by_name` text,
	`at` integer NOT NULL,
	FOREIGN KEY (`lead_id`) REFERENCES `leads`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`question_id`) REFERENCES `questions`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `question_answer_history_q_idx` ON `question_answer_history` (`question_id`,`at`);--> statement-breakpoint
ALTER TABLE `contracts` ADD `casetrust_at` integer;--> statement-breakpoint
ALTER TABLE `project_selection_options` ADD `vendor` text;--> statement-breakpoint
ALTER TABLE `project_selections` ADD `client_answer` text;--> statement-breakpoint
ALTER TABLE `project_selections` ADD `client_answer_note` text;--> statement-breakpoint
ALTER TABLE `project_selections` ADD `client_answer_at` integer;--> statement-breakpoint
ALTER TABLE `project_selections` ADD `client_answer_by` text;--> statement-breakpoint
ALTER TABLE `project_selections` ADD `studio_note` text;--> statement-breakpoint
ALTER TABLE `project_selections` ADD `receipt_file_id` text;--> statement-breakpoint
ALTER TABLE `project_selections` ADD `receipt_hash` text;--> statement-breakpoint
ALTER TABLE `quotes` ADD `declined_at` integer;--> statement-breakpoint
ALTER TABLE `quotes` ADD `declined_note` text;--> statement-breakpoint
ALTER TABLE `quotes` ADD `declined_by` text;