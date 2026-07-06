CREATE TABLE `fg_persons` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`notes` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`deleted_at` text
);
--> statement-breakpoint
CREATE INDEX `idx_fg_persons_name` ON `fg_persons` (`name`);--> statement-breakpoint
CREATE TABLE `fg_tags` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`color` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`deleted_at` text
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_fg_tags_name` ON `fg_tags` (`name`) WHERE "fg_tags"."deleted_at" IS NULL;--> statement-breakpoint
CREATE TABLE `fg_transaction_tags` (
	`transaction_id` integer NOT NULL,
	`tag_id` integer NOT NULL,
	PRIMARY KEY(`transaction_id`, `tag_id`),
	FOREIGN KEY (`transaction_id`) REFERENCES `fg_transactions`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`tag_id`) REFERENCES `fg_tags`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_fg_transaction_tags_tag_id` ON `fg_transaction_tags` (`tag_id`);--> statement-breakpoint
CREATE TABLE `fg_transactions` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`direction` text NOT NULL,
	`description` text NOT NULL,
	`amount_rappen` integer NOT NULL,
	`recurrence` text DEFAULT 'once' NOT NULL,
	`start_date` text NOT NULL,
	`end_date` text,
	`person_id` integer,
	`notes` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`deleted_at` text,
	FOREIGN KEY (`person_id`) REFERENCES `fg_persons`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_fg_transactions_direction` ON `fg_transactions` (`direction`);--> statement-breakpoint
CREATE INDEX `idx_fg_transactions_start_date` ON `fg_transactions` (`start_date`);--> statement-breakpoint
CREATE INDEX `idx_fg_transactions_person_id` ON `fg_transactions` (`person_id`);