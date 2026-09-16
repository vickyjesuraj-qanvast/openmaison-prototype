PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_lead_tasks` (
	`id` text PRIMARY KEY NOT NULL,
	`lead_id` text,
	`title` text NOT NULL,
	`kind` text DEFAULT 'General' NOT NULL,
	`due_at` integer,
	`done` integer DEFAULT false NOT NULL,
	`created_at` integer NOT NULL,
	`creator_id` text,
	`description` text,
	`seen_at` integer,
	`updated_at` integer,
	FOREIGN KEY (`lead_id`) REFERENCES `leads`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
INSERT INTO `__new_lead_tasks`("id", "lead_id", "title", "kind", "due_at", "done", "created_at", "creator_id", "description", "seen_at", "updated_at") SELECT "id", "lead_id", "title", "kind", "due_at", "done", "created_at", "creator_id", "description", "seen_at", "updated_at" FROM `lead_tasks`;--> statement-breakpoint
DROP TABLE `lead_tasks`;--> statement-breakpoint
ALTER TABLE `__new_lead_tasks` RENAME TO `lead_tasks`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE INDEX `lead_tasks_lead_idx` ON `lead_tasks` (`lead_id`);