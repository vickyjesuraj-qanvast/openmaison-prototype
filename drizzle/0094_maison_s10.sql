CREATE TABLE `maison_questions` (
	`id` text PRIMARY KEY NOT NULL,
	`member_id` text NOT NULL,
	`question` text NOT NULL,
	`title` text,
	`path` text,
	`project_id` text,
	`milestone_id` text,
	`asked_at` integer NOT NULL,
	`cleared_at` integer
);
--> statement-breakpoint
CREATE INDEX `maison_questions_member_idx` ON `maison_questions` (`member_id`,`asked_at`);