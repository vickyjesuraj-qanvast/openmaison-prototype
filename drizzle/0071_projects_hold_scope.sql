ALTER TABLE `projects` ADD `on_hold_at` integer;--> statement-breakpoint
ALTER TABLE `projects` ADD `on_hold_reason` text;--> statement-breakpoint
ALTER TABLE `projects` ADD `on_hold_until` integer;--> statement-breakpoint
ALTER TABLE `projects` ADD `on_hold_by` text;--> statement-breakpoint
ALTER TABLE `projects` ADD `scope` text;--> statement-breakpoint
ALTER TABLE `projects` ADD `handover_deferred` text;