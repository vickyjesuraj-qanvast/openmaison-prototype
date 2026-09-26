CREATE TABLE `lead_file_renders` (
	`file_id` text PRIMARY KEY NOT NULL,
	`render_key` text NOT NULL,
	`design_id` text NOT NULL,
	`room_id` text NOT NULL,
	`n` integer NOT NULL,
	FOREIGN KEY (`file_id`) REFERENCES `lead_files`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `lead_file_renders_key_idx` ON `lead_file_renders` (`render_key`);--> statement-breakpoint
CREATE TABLE `render_images` (
	`job_id` text NOT NULL,
	`variant_id` integer NOT NULL,
	`data` text NOT NULL,
	FOREIGN KEY (`job_id`) REFERENCES `render_jobs`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `render_images_key_idx` ON `render_images` (`job_id`,`variant_id`);--> statement-breakpoint
INSERT OR IGNORE INTO `render_images` (`job_id`, `variant_id`, `data`) SELECT j.`id`, json_extract(v.value, '$.id'), json_extract(v.value, '$.imageUrl') FROM `render_jobs` j, json_each(CASE WHEN json_valid(j.`variants_json`) AND json_type(j.`variants_json`) = 'array' THEN j.`variants_json` ELSE '[]' END) v WHERE json_type(v.value, '$.id') = 'integer' AND json_extract(v.value, '$.imageUrl') LIKE 'data:image/%';--> statement-breakpoint
UPDATE `render_jobs` SET `variants_json` = json_set(`variants_json`, '$[0].imageUrl', '/visualizer/img/v/' || `id` || '/' || json_extract(`variants_json`, '$[0].id')) WHERE (CASE WHEN json_valid(`variants_json`) AND json_type(`variants_json`) = 'array' THEN json_extract(`variants_json`, '$[0].imageUrl') END) LIKE 'data:image/%' AND EXISTS (SELECT 1 FROM `render_images` r WHERE r.`job_id` = `render_jobs`.`id` AND r.`variant_id` = json_extract(`render_jobs`.`variants_json`, '$[0].id'));--> statement-breakpoint
UPDATE `render_jobs` SET `variants_json` = json_set(`variants_json`, '$[1].imageUrl', '/visualizer/img/v/' || `id` || '/' || json_extract(`variants_json`, '$[1].id')) WHERE (CASE WHEN json_valid(`variants_json`) AND json_type(`variants_json`) = 'array' THEN json_extract(`variants_json`, '$[1].imageUrl') END) LIKE 'data:image/%' AND EXISTS (SELECT 1 FROM `render_images` r WHERE r.`job_id` = `render_jobs`.`id` AND r.`variant_id` = json_extract(`render_jobs`.`variants_json`, '$[1].id'));--> statement-breakpoint
UPDATE `render_jobs` SET `variants_json` = json_set(`variants_json`, '$[2].imageUrl', '/visualizer/img/v/' || `id` || '/' || json_extract(`variants_json`, '$[2].id')) WHERE (CASE WHEN json_valid(`variants_json`) AND json_type(`variants_json`) = 'array' THEN json_extract(`variants_json`, '$[2].imageUrl') END) LIKE 'data:image/%' AND EXISTS (SELECT 1 FROM `render_images` r WHERE r.`job_id` = `render_jobs`.`id` AND r.`variant_id` = json_extract(`render_jobs`.`variants_json`, '$[2].id'));--> statement-breakpoint
UPDATE `render_jobs` SET `variants_json` = json_set(`variants_json`, '$[3].imageUrl', '/visualizer/img/v/' || `id` || '/' || json_extract(`variants_json`, '$[3].id')) WHERE (CASE WHEN json_valid(`variants_json`) AND json_type(`variants_json`) = 'array' THEN json_extract(`variants_json`, '$[3].imageUrl') END) LIKE 'data:image/%' AND EXISTS (SELECT 1 FROM `render_images` r WHERE r.`job_id` = `render_jobs`.`id` AND r.`variant_id` = json_extract(`render_jobs`.`variants_json`, '$[3].id'));--> statement-breakpoint
UPDATE `render_jobs` SET `variants_json` = json_set(`variants_json`, '$[4].imageUrl', '/visualizer/img/v/' || `id` || '/' || json_extract(`variants_json`, '$[4].id')) WHERE (CASE WHEN json_valid(`variants_json`) AND json_type(`variants_json`) = 'array' THEN json_extract(`variants_json`, '$[4].imageUrl') END) LIKE 'data:image/%' AND EXISTS (SELECT 1 FROM `render_images` r WHERE r.`job_id` = `render_jobs`.`id` AND r.`variant_id` = json_extract(`render_jobs`.`variants_json`, '$[4].id'));--> statement-breakpoint
UPDATE `render_jobs` SET `variants_json` = json_set(`variants_json`, '$[5].imageUrl', '/visualizer/img/v/' || `id` || '/' || json_extract(`variants_json`, '$[5].id')) WHERE (CASE WHEN json_valid(`variants_json`) AND json_type(`variants_json`) = 'array' THEN json_extract(`variants_json`, '$[5].imageUrl') END) LIKE 'data:image/%' AND EXISTS (SELECT 1 FROM `render_images` r WHERE r.`job_id` = `render_jobs`.`id` AND r.`variant_id` = json_extract(`render_jobs`.`variants_json`, '$[5].id'));--> statement-breakpoint
ALTER TABLE `project_rooms` ADD `assets_json` text;--> statement-breakpoint
ALTER TABLE `project_rooms` ADD `state_rev` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `project_rooms` ADD `prior_photo_json` text;--> statement-breakpoint
ALTER TABLE `visualizer_designs` ADD `source_lead_id` text;--> statement-breakpoint
UPDATE `project_rooms` SET `design_id` = (SELECT k.`id` FROM `visualizer_designs` k WHERE k.`kind` = 'lead' AND k.`lead_id` = (SELECT x.`lead_id` FROM `visualizer_designs` x WHERE x.`id` = `project_rooms`.`design_id`) ORDER BY k.`created_at`, k.`id` LIMIT 1) WHERE `design_id` IN (SELECT d.`id` FROM `visualizer_designs` d WHERE d.`kind` = 'lead' AND EXISTS (SELECT 1 FROM `visualizer_designs` o WHERE o.`kind` = 'lead' AND o.`lead_id` = d.`lead_id` AND (o.`created_at` < d.`created_at` OR (o.`created_at` = d.`created_at` AND o.`id` < d.`id`))));--> statement-breakpoint
UPDATE `render_share_links` SET `design_id` = (SELECT k.`id` FROM `visualizer_designs` k WHERE k.`kind` = 'lead' AND k.`lead_id` = (SELECT x.`lead_id` FROM `visualizer_designs` x WHERE x.`id` = `render_share_links`.`design_id`) ORDER BY k.`created_at`, k.`id` LIMIT 1) WHERE `design_id` IN (SELECT d.`id` FROM `visualizer_designs` d WHERE d.`kind` = 'lead' AND EXISTS (SELECT 1 FROM `visualizer_designs` o WHERE o.`kind` = 'lead' AND o.`lead_id` = d.`lead_id` AND (o.`created_at` < d.`created_at` OR (o.`created_at` = d.`created_at` AND o.`id` < d.`id`))));--> statement-breakpoint
DELETE FROM `visualizer_designs` WHERE `id` IN (SELECT d.`id` FROM `visualizer_designs` d WHERE d.`kind` = 'lead' AND EXISTS (SELECT 1 FROM `visualizer_designs` o WHERE o.`kind` = 'lead' AND o.`lead_id` = d.`lead_id` AND (o.`created_at` < d.`created_at` OR (o.`created_at` = d.`created_at` AND o.`id` < d.`id`))));--> statement-breakpoint
CREATE UNIQUE INDEX `visualizer_designs_lead_one_idx` ON `visualizer_designs` (`lead_id`) WHERE kind = 'lead';
