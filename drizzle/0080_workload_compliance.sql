CREATE TABLE `project_compliance` (
	`id` text PRIMARY KEY NOT NULL,
	`project_id` text NOT NULL,
	`item_id` text NOT NULL,
	`state` text NOT NULL,
	`by` text,
	`at` integer NOT NULL,
	FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `project_compliance_item_uq` ON `project_compliance` (`project_id`,`item_id`);--> statement-breakpoint
ALTER TABLE `lead_tasks` ADD `compliance_item` text;--> statement-breakpoint
ALTER TABLE `members` ADD `project_capacity` integer;