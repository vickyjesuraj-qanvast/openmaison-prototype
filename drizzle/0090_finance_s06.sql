ALTER TABLE `expenses` ADD `repeat_every` text;--> statement-breakpoint
ALTER TABLE `expenses` ADD `repeat_next` integer;--> statement-breakpoint
ALTER TABLE `expenses` ADD `repeat_of` text;--> statement-breakpoint
ALTER TABLE `expenses` ADD `repeat_stopped_at` integer;--> statement-breakpoint
ALTER TABLE `expenses` ADD `repeat_stopped_by` text;--> statement-breakpoint
CREATE UNIQUE INDEX `expenses_repeat_day_idx` ON `expenses` (`repeat_of`,`spent_on`);--> statement-breakpoint
CREATE INDEX `expenses_repeat_next_idx` ON `expenses` (`repeat_next`);