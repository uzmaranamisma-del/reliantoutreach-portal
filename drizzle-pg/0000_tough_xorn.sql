CREATE TABLE "activity_logs" (
	"id" text PRIMARY KEY NOT NULL,
	"workspace_id" text,
	"actor_id" text,
	"action" text NOT NULL,
	"entity_type" text NOT NULL,
	"entity_id" text,
	"metadata" jsonb,
	"created_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "campaign_prospects" (
	"id" text PRIMARY KEY NOT NULL,
	"workspace_id" text NOT NULL,
	"campaign_id" text NOT NULL,
	"prospect_id" text NOT NULL,
	"current_step" integer,
	"status" text NOT NULL,
	"last_contacted_at" timestamp with time zone,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "campaign_steps" (
	"id" text PRIMARY KEY NOT NULL,
	"workspace_id" text NOT NULL,
	"campaign_id" text NOT NULL,
	"provider" text,
	"external_id_ciphertext" text,
	"sequence_name" text,
	"sequence_condition" text,
	"step_number" integer NOT NULL,
	"delay_days" integer NOT NULL,
	"wait_amount" integer,
	"wait_unit" text,
	"subject" text,
	"body" text,
	"settings" jsonb,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "campaigns" (
	"id" text PRIMARY KEY NOT NULL,
	"workspace_id" text NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"status" text NOT NULL,
	"provider" text,
	"external_id_ciphertext" text,
	"start_date" timestamp with time zone,
	"end_date" timestamp with time zone,
	"prospect_count" integer DEFAULT 0 NOT NULL,
	"sent_count" integer DEFAULT 0 NOT NULL,
	"delivered_count" integer DEFAULT 0 NOT NULL,
	"reply_count" integer DEFAULT 0 NOT NULL,
	"positive_reply_count" integer DEFAULT 0 NOT NULL,
	"settings" jsonb,
	"last_synced_at" timestamp with time zone,
	"archived_at" timestamp with time zone,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "companies" (
	"id" text PRIMARY KEY NOT NULL,
	"workspace_id" text NOT NULL,
	"name" text NOT NULL,
	"domain" text,
	"website" text,
	"linkedin_url" text,
	"industry" text,
	"employee_count" integer,
	"revenue" double precision,
	"country" text,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "domains" (
	"id" text PRIMARY KEY NOT NULL,
	"workspace_id" text NOT NULL,
	"domain" text NOT NULL,
	"status" text NOT NULL,
	"spf_status" text,
	"dkim_status" text,
	"dmarc_status" text,
	"mx_status" text,
	"dkim_selector" text,
	"last_checked_at" timestamp with time zone,
	"notes" text,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "files" (
	"id" text PRIMARY KEY NOT NULL,
	"workspace_id" text NOT NULL,
	"storage_key" text NOT NULL,
	"filename" text NOT NULL,
	"original_filename" text NOT NULL,
	"content_type" text NOT NULL,
	"size" integer NOT NULL,
	"category" text NOT NULL,
	"uploaded_by" text NOT NULL,
	"deleted_at" timestamp with time zone,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL,
	CONSTRAINT "files_storage_key_unique" UNIQUE("storage_key")
);
--> statement-breakpoint
CREATE TABLE "integrations" (
	"id" text PRIMARY KEY NOT NULL,
	"workspace_id" text NOT NULL,
	"kind" text NOT NULL,
	"credentials_ciphertext" text NOT NULL,
	"status" text NOT NULL,
	"last_four" text,
	"last_synced_at" timestamp with time zone,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "mailboxes" (
	"id" text PRIMARY KEY NOT NULL,
	"workspace_id" text NOT NULL,
	"email" text NOT NULL,
	"display_name" text,
	"domain" text NOT NULL,
	"provider" text,
	"external_id_ciphertext" text,
	"status" text NOT NULL,
	"daily_limit" integer,
	"sent_today" integer DEFAULT 0 NOT NULL,
	"health" text NOT NULL,
	"settings" jsonb,
	"last_synced_at" timestamp with time zone,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "meetings" (
	"id" text PRIMARY KEY NOT NULL,
	"workspace_id" text NOT NULL,
	"prospect_id" text NOT NULL,
	"campaign_id" text,
	"owner_id" text,
	"starts_at" timestamp with time zone NOT NULL,
	"timezone" text NOT NULL,
	"meeting_url" text,
	"status" text NOT NULL,
	"notes" text,
	"outcome" text,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "messages" (
	"id" text PRIMARY KEY NOT NULL,
	"workspace_id" text NOT NULL,
	"campaign_id" text,
	"prospect_id" text,
	"provider" text,
	"external_id_ciphertext" text,
	"type" text NOT NULL,
	"from_email" text NOT NULL,
	"to_email" text NOT NULL,
	"subject" text,
	"body" text NOT NULL,
	"open_count" integer DEFAULT 0 NOT NULL,
	"occurred_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "opportunities" (
	"id" text PRIMARY KEY NOT NULL,
	"workspace_id" text NOT NULL,
	"prospect_id" text,
	"name" text NOT NULL,
	"owner_id" text,
	"estimated_value" double precision DEFAULT 0 NOT NULL,
	"probability" integer DEFAULT 0 NOT NULL,
	"stage" text NOT NULL,
	"expected_close_date" timestamp with time zone,
	"notes" text,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "prospects" (
	"id" text PRIMARY KEY NOT NULL,
	"workspace_id" text NOT NULL,
	"company_id" text,
	"email" text NOT NULL,
	"normalized_email" text NOT NULL,
	"first_name" text,
	"last_name" text,
	"job_title" text,
	"phone" text,
	"linkedin_url" text,
	"country" text,
	"state" text,
	"city" text,
	"source" text,
	"provider" text,
	"external_id_ciphertext" text,
	"status" text DEFAULT 'new' NOT NULL,
	"notes" text,
	"custom_fields" jsonb,
	"archived_at" timestamp with time zone,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "replies" (
	"id" text PRIMARY KEY NOT NULL,
	"workspace_id" text NOT NULL,
	"campaign_id" text,
	"prospect_id" text NOT NULL,
	"provider" text,
	"external_id_ciphertext" text,
	"subject" text,
	"body" text NOT NULL,
	"provider_classification" text,
	"classification" text,
	"received_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "suppression_entries" (
	"id" text PRIMARY KEY NOT NULL,
	"workspace_id" text NOT NULL,
	"email" text NOT NULL,
	"normalized_email" text NOT NULL,
	"reason" text NOT NULL,
	"source" text NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sync_jobs" (
	"id" text PRIMARY KEY NOT NULL,
	"workspace_id" text,
	"kind" text NOT NULL,
	"status" text NOT NULL,
	"cursor" text,
	"records_processed" integer DEFAULT 0 NOT NULL,
	"attempt_count" integer DEFAULT 0 NOT NULL,
	"safe_error_code" text,
	"started_at" timestamp with time zone,
	"finished_at" timestamp with time zone,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" text PRIMARY KEY NOT NULL,
	"auth_subject" text NOT NULL,
	"email" text NOT NULL,
	"name" text,
	"status" text DEFAULT 'active' NOT NULL,
	"timezone" text DEFAULT 'UTC' NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL,
	CONSTRAINT "users_auth_subject_unique" UNIQUE("auth_subject")
);
--> statement-breakpoint
CREATE TABLE "webhook_events" (
	"id" text PRIMARY KEY NOT NULL,
	"provider" text NOT NULL,
	"provider_event_id" text NOT NULL,
	"workspace_id" text,
	"event_type" text NOT NULL,
	"payload_ciphertext" text,
	"status" text NOT NULL,
	"processed_at" timestamp with time zone,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "workspace_invitations" (
	"id" text PRIMARY KEY NOT NULL,
	"workspace_id" text NOT NULL,
	"email" text NOT NULL,
	"role" text NOT NULL,
	"token_hash" text NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"invited_by_user_id" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"accepted_at" timestamp with time zone,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL,
	CONSTRAINT "workspace_invitations_token_hash_unique" UNIQUE("token_hash")
);
--> statement-breakpoint
CREATE TABLE "workspace_members" (
	"id" text PRIMARY KEY NOT NULL,
	"workspace_id" text NOT NULL,
	"user_id" text NOT NULL,
	"role" text NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "workspaces" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"primary_contact_email" text,
	"slug" text NOT NULL,
	"status" text DEFAULT 'trial' NOT NULL,
	"package_name" text DEFAULT 'Launch' NOT NULL,
	"monthly_credits" integer DEFAULT 10000 NOT NULL,
	"monthly_email_capacity" integer DEFAULT 10000 NOT NULL,
	"price_cents" integer DEFAULT 0 NOT NULL,
	"renewal_date" timestamp with time zone,
	"account_manager" text,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL,
	CONSTRAINT "workspaces_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
ALTER TABLE "activity_logs" ADD CONSTRAINT "activity_logs_actor_id_users_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "campaign_prospects" ADD CONSTRAINT "campaign_prospects_campaign_id_campaigns_id_fk" FOREIGN KEY ("campaign_id") REFERENCES "public"."campaigns"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "campaign_prospects" ADD CONSTRAINT "campaign_prospects_prospect_id_prospects_id_fk" FOREIGN KEY ("prospect_id") REFERENCES "public"."prospects"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "campaign_steps" ADD CONSTRAINT "campaign_steps_campaign_id_campaigns_id_fk" FOREIGN KEY ("campaign_id") REFERENCES "public"."campaigns"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "files" ADD CONSTRAINT "files_uploaded_by_users_id_fk" FOREIGN KEY ("uploaded_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "meetings" ADD CONSTRAINT "meetings_prospect_id_prospects_id_fk" FOREIGN KEY ("prospect_id") REFERENCES "public"."prospects"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "meetings" ADD CONSTRAINT "meetings_campaign_id_campaigns_id_fk" FOREIGN KEY ("campaign_id") REFERENCES "public"."campaigns"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "meetings" ADD CONSTRAINT "meetings_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "messages" ADD CONSTRAINT "messages_campaign_id_campaigns_id_fk" FOREIGN KEY ("campaign_id") REFERENCES "public"."campaigns"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "messages" ADD CONSTRAINT "messages_prospect_id_prospects_id_fk" FOREIGN KEY ("prospect_id") REFERENCES "public"."prospects"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "opportunities" ADD CONSTRAINT "opportunities_prospect_id_prospects_id_fk" FOREIGN KEY ("prospect_id") REFERENCES "public"."prospects"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "opportunities" ADD CONSTRAINT "opportunities_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "prospects" ADD CONSTRAINT "prospects_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "replies" ADD CONSTRAINT "replies_campaign_id_campaigns_id_fk" FOREIGN KEY ("campaign_id") REFERENCES "public"."campaigns"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "replies" ADD CONSTRAINT "replies_prospect_id_prospects_id_fk" FOREIGN KEY ("prospect_id") REFERENCES "public"."prospects"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workspace_invitations" ADD CONSTRAINT "workspace_invitations_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workspace_invitations" ADD CONSTRAINT "workspace_invitations_invited_by_user_id_users_id_fk" FOREIGN KEY ("invited_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workspace_members" ADD CONSTRAINT "workspace_members_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workspace_members" ADD CONSTRAINT "workspace_members_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "activity_workspace_time" ON "activity_logs" USING btree ("workspace_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "campaign_prospect_unique" ON "campaign_prospects" USING btree ("campaign_id","prospect_id");--> statement-breakpoint
CREATE INDEX "campaign_steps_campaign" ON "campaign_steps" USING btree ("campaign_id","step_number");--> statement-breakpoint
CREATE INDEX "campaigns_workspace_status" ON "campaigns" USING btree ("workspace_id","status");--> statement-breakpoint
CREATE INDEX "companies_workspace" ON "companies" USING btree ("workspace_id");--> statement-breakpoint
CREATE UNIQUE INDEX "domain_workspace_unique" ON "domains" USING btree ("workspace_id","domain");--> statement-breakpoint
CREATE INDEX "files_workspace" ON "files" USING btree ("workspace_id");--> statement-breakpoint
CREATE UNIQUE INDEX "integration_workspace_kind" ON "integrations" USING btree ("workspace_id","kind");--> statement-breakpoint
CREATE UNIQUE INDEX "mailbox_workspace_email" ON "mailboxes" USING btree ("workspace_id","email");--> statement-breakpoint
CREATE INDEX "meetings_workspace_start" ON "meetings" USING btree ("workspace_id","starts_at");--> statement-breakpoint
CREATE INDEX "messages_workspace_time" ON "messages" USING btree ("workspace_id","occurred_at");--> statement-breakpoint
CREATE INDEX "opportunities_workspace_stage" ON "opportunities" USING btree ("workspace_id","stage");--> statement-breakpoint
CREATE UNIQUE INDEX "prospect_email_workspace" ON "prospects" USING btree ("workspace_id","normalized_email");--> statement-breakpoint
CREATE INDEX "prospect_workspace_status" ON "prospects" USING btree ("workspace_id","status");--> statement-breakpoint
CREATE INDEX "replies_workspace_received" ON "replies" USING btree ("workspace_id","received_at");--> statement-breakpoint
CREATE UNIQUE INDEX "suppression_workspace_email" ON "suppression_entries" USING btree ("workspace_id","normalized_email");--> statement-breakpoint
CREATE INDEX "sync_jobs_workspace_status" ON "sync_jobs" USING btree ("workspace_id","status");--> statement-breakpoint
CREATE UNIQUE INDEX "webhook_provider_event" ON "webhook_events" USING btree ("provider","provider_event_id");--> statement-breakpoint
CREATE INDEX "invitation_workspace" ON "workspace_invitations" USING btree ("workspace_id","status");--> statement-breakpoint
CREATE INDEX "invitation_email" ON "workspace_invitations" USING btree ("email","status");--> statement-breakpoint
CREATE UNIQUE INDEX "membership_unique" ON "workspace_members" USING btree ("workspace_id","user_id");--> statement-breakpoint
CREATE INDEX "membership_user" ON "workspace_members" USING btree ("user_id");--> statement-breakpoint
ALTER TABLE "activity_logs" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "campaign_prospects" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "campaign_steps" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "campaigns" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "companies" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "domains" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "files" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "integrations" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "mailboxes" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "meetings" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "messages" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "opportunities" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "prospects" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "replies" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "suppression_entries" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "sync_jobs" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "users" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "webhook_events" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "workspace_invitations" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "workspace_members" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "workspaces" ENABLE ROW LEVEL SECURITY;
