CREATE TABLE `marketplace_banners` (
	`id` text PRIMARY KEY NOT NULL,
	`picture` text NOT NULL,
	`title` text NOT NULL,
	`line` text,
	`href` text NOT NULL,
	`position` integer DEFAULT 0 NOT NULL,
	`starts_at` integer,
	`ends_at` integer,
	`feed_ref` text,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `marketplace_brands` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`categories` text DEFAULT '[]' NOT NULL,
	`tagline` text,
	`services` text,
	`logo` text,
	`cover` text,
	`gallery` text DEFAULT '[]' NOT NULL,
	`whatsapp` text,
	`email` text,
	`websites` text DEFAULT '[]' NOT NULL,
	`instagram` text,
	`facebook` text,
	`youtube` text,
	`addresses` text DEFAULT '[]' NOT NULL,
	`faqs` text DEFAULT '[]' NOT NULL,
	`featured_rank` integer,
	`popularity` integer DEFAULT 0 NOT NULL,
	`reviews` integer DEFAULT 0 NOT NULL,
	`published_at` integer NOT NULL,
	`feed_ref` text,
	`updated_at` integer NOT NULL,
	`removed_at` integer
);
--> statement-breakpoint
CREATE TABLE `marketplace_categories` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`position` integer DEFAULT 0 NOT NULL,
	`feed_ref` text,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `marketplace_deal_asks` (
	`id` text PRIMARY KEY NOT NULL,
	`deal_id` text NOT NULL,
	`member_id` text NOT NULL,
	`how` text NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`deal_id`) REFERENCES `marketplace_deals`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `marketplace_deal_asks_deal_idx` ON `marketplace_deal_asks` (`deal_id`,`created_at`);--> statement-breakpoint
CREATE TABLE `marketplace_deals` (
	`id` text PRIMARY KEY NOT NULL,
	`brand_id` text NOT NULL,
	`title` text NOT NULL,
	`description` text,
	`terms` text,
	`redemption` text,
	`starts_at` integer,
	`ends_at` integer,
	`cta_url` text,
	`cta_text` text,
	`picture` text,
	`flash` integer DEFAULT false NOT NULL,
	`position` integer DEFAULT 0 NOT NULL,
	`feed_ref` text,
	`updated_at` integer NOT NULL,
	`removed_at` integer,
	FOREIGN KEY (`brand_id`) REFERENCES `marketplace_brands`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `marketplace_deals_brand_idx` ON `marketplace_deals` (`brand_id`);--> statement-breakpoint
CREATE TABLE `marketplace_products` (
	`id` text PRIMARY KEY NOT NULL,
	`brand_id` text NOT NULL,
	`name` text NOT NULL,
	`description` text,
	`price_minor` integer,
	`unit` text,
	`link` text,
	`picture` text,
	`position` integer DEFAULT 0 NOT NULL,
	`feed_ref` text,
	`updated_at` integer NOT NULL,
	`removed_at` integer,
	FOREIGN KEY (`brand_id`) REFERENCES `marketplace_brands`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `marketplace_products_brand_idx` ON `marketplace_products` (`brand_id`);--> statement-breakpoint
ALTER TABLE `price_book_items` ADD `marketplace_product_id` text;--> statement-breakpoint
ALTER TABLE `vendors` ADD `marketplace_brand_id` text;