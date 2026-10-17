CREATE TABLE `space_layout_shares` (
	`id` text PRIMARY KEY NOT NULL,
	`layout_id` text NOT NULL,
	`lead_id` text,
	`token` text NOT NULL,
	`snapshot` text NOT NULL,
	`name` text NOT NULL,
	`message` text,
	`shared_rev` integer DEFAULT 0 NOT NULL,
	`shared_by` text,
	`shared_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`sent_via` text,
	`first_viewed_at` integer,
	`last_viewed_at` integer,
	`view_count` integer DEFAULT 0 NOT NULL,
	`revoked_at` integer,
	`revoked_by` text,
	FOREIGN KEY (`layout_id`) REFERENCES `space_layouts`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `space_layout_shares_token_idx` ON `space_layout_shares` (`token`);--> statement-breakpoint
CREATE INDEX `space_layout_shares_layout_idx` ON `space_layout_shares` (`layout_id`);--> statement-breakpoint
CREATE INDEX `space_layout_shares_lead_idx` ON `space_layout_shares` (`lead_id`);--> statement-breakpoint
CREATE TABLE `space_layouts` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`template_key` text,
	`project_id` text,
	`lead_id` text,
	`plan` text NOT NULL,
	`rev` integer DEFAULT 0 NOT NULL,
	`created_by` text,
	`updated_by` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`deleted_at` integer,
	`deleted_by` text
);
--> statement-breakpoint
CREATE INDEX `space_layouts_project_idx` ON `space_layouts` (`project_id`,`updated_at`);--> statement-breakpoint
CREATE INDEX `space_layouts_lead_idx` ON `space_layouts` (`lead_id`);