CREATE TABLE `market_insights` (
	`id` text PRIMARY KEY NOT NULL,
	`title` text NOT NULL,
	`excerpt` text,
	`content` text DEFAULT '' NOT NULL,
	`category` text NOT NULL,
	`cover` text,
	`tags` text DEFAULT '[]' NOT NULL,
	`author` text NOT NULL,
	`read_minutes` integer DEFAULT 5 NOT NULL,
	`featured` integer DEFAULT false NOT NULL,
	`sample` integer DEFAULT false NOT NULL,
	`published_at` integer NOT NULL,
	`feed_ref` text,
	`updated_at` integer NOT NULL,
	`removed_at` integer
);
--> statement-breakpoint
CREATE INDEX `market_insights_published_idx` ON `market_insights` (`removed_at`,`published_at`);