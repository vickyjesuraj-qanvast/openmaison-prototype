ALTER TABLE `credit_notes` ADD `kind` text DEFAULT 'credit' NOT NULL;--> statement-breakpoint
ALTER TABLE `credit_notes` ADD `payment_id` text;--> statement-breakpoint
CREATE INDEX `credit_notes_payment_idx` ON `credit_notes` (`payment_id`);--> statement-breakpoint
ALTER TABLE `project_payments` ADD `credit_note_id` text;--> statement-breakpoint
CREATE INDEX `project_payments_credit_idx` ON `project_payments` (`credit_note_id`);