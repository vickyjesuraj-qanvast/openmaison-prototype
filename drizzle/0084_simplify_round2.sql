ALTER TABLE `members` ADD `paynow` text;--> statement-breakpoint
ALTER TABLE `notification_outbox` ADD `send_after` integer;--> statement-breakpoint
ALTER TABLE `project_messages` ADD `task_id` text;--> statement-breakpoint
ALTER TABLE `project_messages` ADD `variation_id` text;--> statement-breakpoint
ALTER TABLE `project_tickets` ADD `task_id` text;--> statement-breakpoint
ALTER TABLE `project_tickets` ADD `variation_id` text;