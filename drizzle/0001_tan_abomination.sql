CREATE TABLE `integrations` (
	`id` text PRIMARY KEY NOT NULL,
	`workspace_id` text NOT NULL,
	`kind` text NOT NULL,
	`credentials_ciphertext` text NOT NULL,
	`status` text NOT NULL,
	`last_four` text,
	`last_synced_at` integer,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `integration_workspace_kind` ON `integrations` (`workspace_id`,`kind`);