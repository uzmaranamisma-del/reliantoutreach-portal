CREATE TABLE `messages` (
	`id` text PRIMARY KEY NOT NULL,
	`workspace_id` text NOT NULL,
	`campaign_id` text,
	`prospect_id` text,
	`provider` text,
	`external_id_ciphertext` text,
	`type` text NOT NULL,
	`from_email` text NOT NULL,
	`to_email` text NOT NULL,
	`subject` text,
	`body` text NOT NULL,
	`occurred_at` integer NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`campaign_id`) REFERENCES `campaigns`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`prospect_id`) REFERENCES `prospects`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `messages_workspace_time` ON `messages` (`workspace_id`,`occurred_at`);--> statement-breakpoint
ALTER TABLE `prospects` ADD `provider` text;--> statement-breakpoint
ALTER TABLE `prospects` ADD `external_id_ciphertext` text;