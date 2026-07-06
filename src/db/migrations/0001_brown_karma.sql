ALTER TABLE `todos` ADD `parent_id` integer REFERENCES todos(id);--> statement-breakpoint
ALTER TABLE `todos` ADD `sort_order` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
CREATE INDEX `idx_todos_parent_id` ON `todos` (`parent_id`);