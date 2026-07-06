ALTER TABLE `invoice_items` ADD `billing_active` integer DEFAULT 1 NOT NULL;
--> statement-breakpoint
DROP INDEX `idx_invoice_items_active_session`;
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_invoice_items_active_session` ON `invoice_items` (`session_id`)
	WHERE "invoice_items"."session_id" IS NOT NULL AND "invoice_items"."billing_active" = 1;
--> statement-breakpoint
UPDATE `invoice_items` SET `billing_active` = 0
	WHERE `invoice_id` IN (SELECT `id` FROM `invoices` WHERE `status` = 'cancelled' OR `deleted_at` IS NOT NULL);
