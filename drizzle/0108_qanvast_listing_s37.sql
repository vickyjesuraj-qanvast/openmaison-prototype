CREATE TABLE `studio_verification_files` (
	`id` text PRIMARY KEY NOT NULL,
	`kind` text NOT NULL,
	`name` text NOT NULL,
	`mime` text NOT NULL,
	`size_bytes` integer NOT NULL,
	`data` text NOT NULL,
	`added_by` text,
	`added_at` integer NOT NULL,
	`removed_at` integer
);
--> statement-breakpoint
CREATE INDEX `studio_verification_files_kind_idx` ON `studio_verification_files` (`kind`,`added_at`);--> statement-breakpoint
CREATE TABLE `studio_verifications` (
	`id` text PRIMARY KEY NOT NULL,
	`kind` text NOT NULL,
	`status` text NOT NULL,
	`studio_name` text,
	`uen` text,
	`description` text,
	`differentiator` text,
	`projects_delivered` integer,
	`submitted_documents` text,
	`provider_ref` text,
	`submitted_by` text,
	`submitted_at` integer NOT NULL,
	`withdrawn_at` integer,
	`withdrawn_by` text,
	`reviewed_at` integer,
	`admin_notes` text,
	`answered_via` text,
	`closed_at` integer,
	`closed_by` text
);
--> statement-breakpoint
CREATE INDEX `studio_verifications_submitted_idx` ON `studio_verifications` (`submitted_at`);--> statement-breakpoint
CREATE INDEX `studio_verifications_ref_idx` ON `studio_verifications` (`provider_ref`);