ALTER TABLE `projects` ADD `completed_by` text;--> statement-breakpoint
ALTER TABLE `projects` ADD `complete_note` text;--> statement-breakpoint
ALTER TABLE `projects` ADD `complete_reason` text;--> statement-breakpoint
ALTER TABLE `projects` ADD `handover_requested_by` text;--> statement-breakpoint
ALTER TABLE `projects` ADD `handover_requested_at` integer;--> statement-breakpoint
ALTER TABLE `projects` ADD `handover_note` text;--> statement-breakpoint
ALTER TABLE `projects` ADD `handover_review_note` text;--> statement-breakpoint
ALTER TABLE `projects` ADD `handover_reviewed_by` text;--> statement-breakpoint
ALTER TABLE `projects` ADD `handover_reviewed_at` integer;--> statement-breakpoint
ALTER TABLE `projects` ADD `reopened_by` text;--> statement-breakpoint
ALTER TABLE `projects` ADD `reopened_at` integer;--> statement-breakpoint
ALTER TABLE `projects` ADD `reopen_reason` text;