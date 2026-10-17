CREATE TABLE `studio_fonts` (
	`id` text PRIMARY KEY NOT NULL,
	`family` text NOT NULL,
	`weight` integer DEFAULT 400 NOT NULL,
	`italic` integer DEFAULT false NOT NULL,
	`format` text NOT NULL,
	`file_name` text NOT NULL,
	`size` integer NOT NULL,
	`data` text NOT NULL,
	`licensed_by` text,
	`created_by` text,
	`created_at` integer NOT NULL,
	`deleted_at` integer,
	`deleted_by` text
);
--> statement-breakpoint
CREATE INDEX `studio_fonts_family_idx` ON `studio_fonts` (`family`);