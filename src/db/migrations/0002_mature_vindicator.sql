CREATE TABLE `session_rates` (
	`session_type` text PRIMARY KEY NOT NULL,
	`rate_rappen` integer NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
ALTER TABLE `invoice_items` ADD `session_id` integer REFERENCES sessions(id);--> statement-breakpoint
ALTER TABLE `invoice_items` ADD `duration_minutes` integer;--> statement-breakpoint
CREATE UNIQUE INDEX `idx_invoice_items_active_session` ON `invoice_items` (`session_id`) WHERE "invoice_items"."session_id" IS NOT NULL;
--> statement-breakpoint
INSERT INTO `session_rates` (`session_type`, `rate_rappen`, `updated_at`) VALUES
	('praxis',     13000, strftime('%Y-%m-%dT%H:%M:%fZ','now')),
	('praxis_2',   13000, strftime('%Y-%m-%dT%H:%M:%fZ','now')),
	('telephone',  13000, strftime('%Y-%m-%dT%H:%M:%fZ','now')),
	('home_visit', 13000, strftime('%Y-%m-%dT%H:%M:%fZ','now')),
	('emergency',  13000, strftime('%Y-%m-%dT%H:%M:%fZ','now'));
