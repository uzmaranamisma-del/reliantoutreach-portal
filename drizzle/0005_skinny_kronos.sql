DROP INDEX `campaign_step_unique`;--> statement-breakpoint
ALTER TABLE `campaign_steps` ADD `provider` text;--> statement-breakpoint
ALTER TABLE `campaign_steps` ADD `external_id_ciphertext` text;--> statement-breakpoint
ALTER TABLE `campaign_steps` ADD `sequence_name` text;--> statement-breakpoint
ALTER TABLE `campaign_steps` ADD `sequence_condition` text;--> statement-breakpoint
ALTER TABLE `campaign_steps` ADD `wait_amount` integer;--> statement-breakpoint
ALTER TABLE `campaign_steps` ADD `wait_unit` text;--> statement-breakpoint
ALTER TABLE `campaign_steps` ADD `settings` text;--> statement-breakpoint
CREATE INDEX `campaign_steps_campaign` ON `campaign_steps` (`campaign_id`,`step_number`);