CREATE TABLE `billing_checkout_sessions` (
	`id` text PRIMARY KEY NOT NULL,
	`member_id` text,
	`kind` text NOT NULL,
	`plan_id` text,
	`seats` integer DEFAULT 1 NOT NULL,
	`period` text DEFAULT 'monthly' NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`credits_granted` integer,
	`created_at` integer NOT NULL,
	`completed_at` integer
);
--> statement-breakpoint
CREATE TABLE `credit_ledger` (
	`id` text PRIMARY KEY NOT NULL,
	`member_id` text,
	`action_key` text NOT NULL,
	`credits` integer NOT NULL,
	`balance_after` integer NOT NULL,
	`reason` text NOT NULL,
	`ref_id` text,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `credit_ledger_at_idx` ON `credit_ledger` (`created_at`);--> statement-breakpoint
CREATE INDEX `credit_ledger_ref_idx` ON `credit_ledger` (`action_key`,`ref_id`);--> statement-breakpoint
CREATE TABLE `credit_requests` (
	`id` text PRIMARY KEY NOT NULL,
	`member_id` text NOT NULL,
	`kind` text NOT NULL,
	`needed` integer DEFAULT 0 NOT NULL,
	`status` text DEFAULT 'open' NOT NULL,
	`answered_by` text,
	`answered_at` integer,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `credit_requests_status_idx` ON `credit_requests` (`status`,`created_at`);--> statement-breakpoint
CREATE TABLE `invoices` (
	`id` text PRIMARY KEY NOT NULL,
	`subscription_id` text,
	`invoice_number` text NOT NULL,
	`plan_name` text NOT NULL,
	`amount` integer NOT NULL,
	`currency` text DEFAULT 'SGD' NOT NULL,
	`billing_period_start` integer NOT NULL,
	`billing_period_end` integer NOT NULL,
	`status` text DEFAULT 'paid' NOT NULL,
	`issued_at` integer NOT NULL,
	`paid_at` integer
);
--> statement-breakpoint
CREATE UNIQUE INDEX `invoices_number_uq` ON `invoices` (`invoice_number`);--> statement-breakpoint
CREATE TABLE `plans` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`monthly_price` integer DEFAULT 0 NOT NULL,
	`yearly_price` integer DEFAULT 0 NOT NULL,
	`max_members` integer,
	`credit_allowance` integer DEFAULT 0 NOT NULL,
	`signup_credit_grant` integer DEFAULT 0 NOT NULL,
	`feature_flags` text DEFAULT '{}' NOT NULL,
	`min_seats` integer DEFAULT 1 NOT NULL,
	`extra_seat_price_cents` integer,
	`is_contact_sales` integer DEFAULT false NOT NULL,
	`trial_period_days` integer DEFAULT 0 NOT NULL,
	`is_highlighted` integer DEFAULT false NOT NULL,
	`is_active` integer DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE TABLE `studio_credit_balances` (
	`id` text PRIMARY KEY NOT NULL,
	`plan_credits` integer DEFAULT 0 NOT NULL,
	`topup_credits` integer DEFAULT 0 NOT NULL,
	`period_start` integer NOT NULL,
	`period_end` integer NOT NULL,
	`enforcement_enabled` integer DEFAULT true NOT NULL,
	`enforcement_starts_at` integer,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `studio_member_credit_caps` (
	`member_id` text PRIMARY KEY NOT NULL,
	`monthly_cap` integer,
	`updated_by` text,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `subscriptions` (
	`id` text PRIMARY KEY NOT NULL,
	`plan_id` text NOT NULL,
	`billing_cycle` text DEFAULT 'monthly' NOT NULL,
	`status` text DEFAULT 'active' NOT NULL,
	`seats` integer DEFAULT 1 NOT NULL,
	`current_period_start` integer NOT NULL,
	`current_period_end` integer NOT NULL,
	`trial_ends_at` integer,
	`cancel_at_period_end` integer DEFAULT false NOT NULL,
	`cancelled_at` integer,
	`grace_until` integer,
	`created_by` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
