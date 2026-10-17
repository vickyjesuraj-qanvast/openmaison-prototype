ALTER TABLE `contract_templates` ADD `use_at_handover` integer DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `contracts` ADD `ask_deposit` integer DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `contracts` ADD `purpose` text;--> statement-breakpoint
ALTER TABLE `contracts` ADD `to_read` integer DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `contracts` ADD `defects_months` integer;--> statement-breakpoint
ALTER TABLE `supplier_bills` ADD `approval_why` text;--> statement-breakpoint
ALTER TABLE `supplier_bills` ADD `approved_by` text;--> statement-breakpoint
ALTER TABLE `supplier_bills` ADD `approved_at` integer;