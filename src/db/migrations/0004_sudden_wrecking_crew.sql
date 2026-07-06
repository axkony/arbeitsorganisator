PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_invoices` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`patient_id` integer NOT NULL,
	`invoice_number` text,
	`status` text DEFAULT 'draft' NOT NULL,
	`currency` text DEFAULT 'CHF' NOT NULL,
	`issued_at` text,
	`due_at` text,
	`paid_at` text,
	`notes` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`deleted_at` text,
	FOREIGN KEY (`patient_id`) REFERENCES `patients`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
INSERT INTO `__new_invoices`("id", "patient_id", "invoice_number", "status", "currency", "issued_at", "due_at", "paid_at", "notes", "created_at", "updated_at", "deleted_at") SELECT "id", "patient_id", "invoice_number", "status", "currency", "issued_at", "due_at", "paid_at", "notes", "created_at", "updated_at", "deleted_at" FROM `invoices`;--> statement-breakpoint
DROP TABLE `invoices`;--> statement-breakpoint
ALTER TABLE `__new_invoices` RENAME TO `invoices`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE UNIQUE INDEX `invoices_invoice_number_unique` ON `invoices` (`invoice_number`);--> statement-breakpoint
CREATE INDEX `idx_invoices_patient_id` ON `invoices` (`patient_id`);--> statement-breakpoint
CREATE INDEX `idx_invoices_status` ON `invoices` (`status`);