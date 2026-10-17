CREATE TABLE `cost_documents` (
	`id` text PRIMARY KEY NOT NULL,
	`record_kind` text NOT NULL,
	`record_id` text NOT NULL,
	`name` text NOT NULL,
	`mime` text NOT NULL,
	`size_bytes` integer DEFAULT 0 NOT NULL,
	`data` text NOT NULL,
	`thumb` text,
	`created_by` text,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `cost_documents_record_idx` ON `cost_documents` (`record_kind`,`record_id`);--> statement-breakpoint
CREATE TABLE `expenses` (
	`id` text PRIMARY KEY NOT NULL,
	`project_id` text,
	`vendor_id` text,
	`category` text NOT NULL,
	`description` text NOT NULL,
	`amount_minor` integer NOT NULL,
	`gst_minor` integer DEFAULT 0 NOT NULL,
	`spent_on` integer NOT NULL,
	`paid_by` text DEFAULT 'studio' NOT NULL,
	`claimant_id` text,
	`status` text DEFAULT 'pending' NOT NULL,
	`review_note` text,
	`reviewed_by` text,
	`reviewed_at` integer,
	`note` text,
	`created_by` text,
	`created_at` integer NOT NULL,
	`updated_by` text,
	`updated_at` integer,
	`deleted_by` text,
	`deleted_at` integer,
	FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`vendor_id`) REFERENCES `vendors`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `expenses_project_idx` ON `expenses` (`project_id`);--> statement-breakpoint
CREATE INDEX `expenses_claimant_idx` ON `expenses` (`claimant_id`);--> statement-breakpoint
CREATE TABLE `payments_out` (
	`id` text PRIMARY KEY NOT NULL,
	`kind` text NOT NULL,
	`project_id` text,
	`vendor_id` text,
	`member_id` text,
	`po_id` text,
	`bill_id` text,
	`expense_id` text,
	`amount_minor` integer NOT NULL,
	`advance` integer DEFAULT false NOT NULL,
	`paid_on` integer NOT NULL,
	`method` text NOT NULL,
	`reference` text,
	`note` text,
	`created_by` text,
	`created_at` integer NOT NULL,
	`reversed_by` text,
	`reversed_at` integer,
	`reverse_reason` text,
	FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`vendor_id`) REFERENCES `vendors`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`po_id`) REFERENCES `purchase_orders`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`bill_id`) REFERENCES `supplier_bills`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`expense_id`) REFERENCES `expenses`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `payments_out_project_idx` ON `payments_out` (`project_id`);--> statement-breakpoint
CREATE INDEX `payments_out_po_idx` ON `payments_out` (`po_id`);--> statement-breakpoint
CREATE INDEX `payments_out_bill_idx` ON `payments_out` (`bill_id`);--> statement-breakpoint
CREATE INDEX `payments_out_expense_idx` ON `payments_out` (`expense_id`);--> statement-breakpoint
CREATE TABLE `purchase_order_lines` (
	`id` text PRIMARY KEY NOT NULL,
	`po_id` text NOT NULL,
	`position` integer DEFAULT 0 NOT NULL,
	`description` text NOT NULL,
	`category` text,
	`qty` real DEFAULT 1 NOT NULL,
	`unit` text,
	`unit_minor` integer DEFAULT 0 NOT NULL,
	`amount_minor` integer DEFAULT 0 NOT NULL,
	`quote_item_id` text,
	`milestone_id` text,
	FOREIGN KEY (`po_id`) REFERENCES `purchase_orders`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `purchase_order_lines_po_idx` ON `purchase_order_lines` (`po_id`);--> statement-breakpoint
CREATE TABLE `purchase_orders` (
	`id` text PRIMARY KEY NOT NULL,
	`project_id` text NOT NULL,
	`vendor_id` text NOT NULL,
	`number` text NOT NULL,
	`status` text DEFAULT 'draft' NOT NULL,
	`title` text,
	`subtotal_minor` integer DEFAULT 0 NOT NULL,
	`gst_minor` integer DEFAULT 0 NOT NULL,
	`total_minor` integer DEFAULT 0 NOT NULL,
	`charges_gst` integer DEFAULT false NOT NULL,
	`gst_rate` real DEFAULT 0 NOT NULL,
	`advance_kind` text DEFAULT 'none' NOT NULL,
	`advance_value` real DEFAULT 0 NOT NULL,
	`advance_minor` integer DEFAULT 0 NOT NULL,
	`terms` text DEFAULT 'net30' NOT NULL,
	`terms_text` text,
	`expected_on` integer,
	`delivery_address` text,
	`vendor_note` text,
	`issuing_entity` text,
	`created_by` text,
	`created_at` integer NOT NULL,
	`updated_by` text,
	`updated_at` integer,
	`submitted_by` text,
	`submitted_at` integer,
	`review_note` text,
	`reviewed_by` text,
	`reviewed_at` integer,
	`approved_by` text,
	`approved_at` integer,
	`sent_by` text,
	`sent_at` integer,
	`due_on` integer,
	`vendor_token` text,
	`vendor_viewed_at` integer,
	`vendor_answer` text,
	`vendor_answer_note` text,
	`vendor_answered_at` integer,
	`answer_via` text,
	`answer_marked_by` text,
	`closed_by` text,
	`closed_at` integer,
	`close_note` text,
	`cancelled_by` text,
	`cancelled_at` integer,
	`cancel_reason` text,
	`deleted_by` text,
	`deleted_at` integer,
	FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`vendor_id`) REFERENCES `vendors`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `purchase_orders_project_idx` ON `purchase_orders` (`project_id`);--> statement-breakpoint
CREATE INDEX `purchase_orders_vendor_idx` ON `purchase_orders` (`vendor_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `purchase_orders_number_uq` ON `purchase_orders` (`number`);--> statement-breakpoint
CREATE UNIQUE INDEX `purchase_orders_token_uq` ON `purchase_orders` (`vendor_token`);--> statement-breakpoint
CREATE TABLE `supplier_bills` (
	`id` text PRIMARY KEY NOT NULL,
	`project_id` text,
	`vendor_id` text NOT NULL,
	`po_id` text,
	`reference` text NOT NULL,
	`issued_on` integer NOT NULL,
	`due_on` integer,
	`subtotal_minor` integer DEFAULT 0 NOT NULL,
	`gst_minor` integer DEFAULT 0 NOT NULL,
	`total_minor` integer DEFAULT 0 NOT NULL,
	`lines_json` text,
	`note` text,
	`read_from` text,
	`read_fields` text,
	`created_by` text,
	`created_at` integer NOT NULL,
	`updated_by` text,
	`updated_at` integer,
	`deleted_by` text,
	`deleted_at` integer,
	FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`vendor_id`) REFERENCES `vendors`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`po_id`) REFERENCES `purchase_orders`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `supplier_bills_project_idx` ON `supplier_bills` (`project_id`);--> statement-breakpoint
CREATE INDEX `supplier_bills_vendor_idx` ON `supplier_bills` (`vendor_id`);--> statement-breakpoint
CREATE INDEX `supplier_bills_po_idx` ON `supplier_bills` (`po_id`);--> statement-breakpoint
CREATE TABLE `vendors` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`trade` text,
	`contact_name` text,
	`phone` text,
	`email` text,
	`uen` text,
	`charges_gst` integer DEFAULT false NOT NULL,
	`bank_name` text,
	`account_name` text,
	`account_no` text,
	`pay_now` text,
	`notes` text,
	`is_active` integer DEFAULT true NOT NULL,
	`deactivated_at` integer,
	`merged_into` text,
	`merged_at` integer,
	`merged_by` text,
	`created_by` text,
	`created_at` integer NOT NULL,
	`updated_by` text,
	`updated_at` integer
);
--> statement-breakpoint
CREATE INDEX `vendors_name_idx` ON `vendors` (`name`);