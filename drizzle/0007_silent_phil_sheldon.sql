ALTER TABLE `workspaces` ADD `package_name` text DEFAULT 'Launch' NOT NULL;--> statement-breakpoint
ALTER TABLE `workspaces` ADD `monthly_credits` integer DEFAULT 10000 NOT NULL;--> statement-breakpoint
ALTER TABLE `workspaces` ADD `price_cents` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `workspaces` ADD `renewal_date` integer;--> statement-breakpoint
ALTER TABLE `workspaces` ADD `account_manager` text;