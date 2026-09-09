import {
  doublePrecision,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
} from 'drizzle-orm/pg-core';
const id = () => text('id').primaryKey();
const wid = () => text('workspace_id').notNull();
const times = {
  createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'date' }).notNull(),
};
export const users = pgTable('users', {
  id: id(),
  authSubject: text('auth_subject').notNull().unique(),
  email: text('email').notNull(),
  name: text('name'),
  status: text('status').notNull().default('active'),
  timezone: text('timezone').notNull().default('UTC'),
  ...times,
});
export const workspaces = pgTable('workspaces', {
  id: id(),
  name: text('name').notNull(),
  primaryContactEmail: text('primary_contact_email'),
  slug: text('slug').notNull().unique(),
  status: text('status').notNull().default('trial'),
  packageName: text('package_name').notNull().default('Launch'),
  monthlyCredits: integer('monthly_credits').notNull().default(10000),
  monthlyEmailCapacity: integer('monthly_email_capacity')
    .notNull()
    .default(10000),
  priceCents: integer('price_cents').notNull().default(0),
  renewalDate: timestamp('renewal_date', { withTimezone: true, mode: 'date' }),
  accountManager: text('account_manager'),
  ...times,
});
export const workspaceMembers = pgTable(
  'workspace_members',
  {
    id: id(),
    workspaceId: wid().references(() => workspaces.id),
    userId: text('user_id')
      .notNull()
      .references(() => users.id),
    role: text('role', {
      enum: ['super_admin', 'account_manager', 'client_admin', 'client_viewer'],
    }).notNull(),
    status: text('status').notNull().default('active'),
    ...times,
  },
  (t) => [
    uniqueIndex('membership_unique').on(t.workspaceId, t.userId),
    index('membership_user').on(t.userId),
  ],
);
export const workspaceInvitations = pgTable(
  'workspace_invitations',
  {
    id: id(),
    workspaceId: wid().references(() => workspaces.id),
    email: text('email').notNull(),
    role: text('role', { enum: ['client_admin', 'client_viewer'] }).notNull(),
    tokenHash: text('token_hash').notNull().unique(),
    status: text('status').notNull().default('pending'),
    invitedByUserId: text('invited_by_user_id')
      .notNull()
      .references(() => users.id),
    expiresAt: timestamp('expires_at', { withTimezone: true, mode: 'date' }).notNull(),
    acceptedAt: timestamp('accepted_at', { withTimezone: true, mode: 'date' }),
    ...times,
  },
  (t) => [
    index('invitation_workspace').on(t.workspaceId, t.status),
    index('invitation_email').on(t.email, t.status),
  ],
);
export const companies = pgTable(
  'companies',
  {
    id: id(),
    workspaceId: wid(),
    name: text('name').notNull(),
    domain: text('domain'),
    website: text('website'),
    linkedinUrl: text('linkedin_url'),
    industry: text('industry'),
    employeeCount: integer('employee_count'),
    revenue: doublePrecision('revenue'),
    country: text('country'),
    ...times,
  },
  (t) => [index('companies_workspace').on(t.workspaceId)],
);
export const campaigns = pgTable(
  'campaigns',
  {
    id: id(),
    workspaceId: wid(),
    name: text('name').notNull(),
    description: text('description'),
    status: text('status').notNull(),
    provider: text('provider'),
    externalIdCiphertext: text('external_id_ciphertext'),
    startDate: timestamp('start_date', { withTimezone: true, mode: 'date' }),
    endDate: timestamp('end_date', { withTimezone: true, mode: 'date' }),
    prospectCount: integer('prospect_count').notNull().default(0),
    sentCount: integer('sent_count').notNull().default(0),
    deliveredCount: integer('delivered_count').notNull().default(0),
    replyCount: integer('reply_count').notNull().default(0),
    positiveReplyCount: integer('positive_reply_count').notNull().default(0),
    settings: jsonb('settings'),
    lastSyncedAt: timestamp('last_synced_at', { withTimezone: true, mode: 'date' }),
    archivedAt: timestamp('archived_at', { withTimezone: true, mode: 'date' }),
    ...times,
  },
  (t) => [index('campaigns_workspace_status').on(t.workspaceId, t.status)],
);
export const campaignSteps = pgTable(
  'campaign_steps',
  {
    id: id(),
    workspaceId: wid(),
    campaignId: text('campaign_id')
      .notNull()
      .references(() => campaigns.id),
    provider: text('provider'),
    externalIdCiphertext: text('external_id_ciphertext'),
    sequenceName: text('sequence_name'),
    sequenceCondition: text('sequence_condition'),
    stepNumber: integer('step_number').notNull(),
    delayDays: integer('delay_days').notNull(),
    waitAmount: integer('wait_amount'),
    waitUnit: text('wait_unit'),
    subject: text('subject'),
    body: text('body'),
    settings: jsonb('settings'),
    ...times,
  },
  (t) => [index('campaign_steps_campaign').on(t.campaignId, t.stepNumber)],
);
export const prospects = pgTable(
  'prospects',
  {
    id: id(),
    workspaceId: wid(),
    companyId: text('company_id').references(() => companies.id),
    email: text('email').notNull(),
    normalizedEmail: text('normalized_email').notNull(),
    firstName: text('first_name'),
    lastName: text('last_name'),
    jobTitle: text('job_title'),
    phone: text('phone'),
    linkedinUrl: text('linkedin_url'),
    country: text('country'),
    state: text('state'),
    city: text('city'),
    source: text('source'),
    provider: text('provider'),
    externalIdCiphertext: text('external_id_ciphertext'),
    status: text('status').notNull().default('new'),
    notes: text('notes'),
    customFields: jsonb('custom_fields'),
    archivedAt: timestamp('archived_at', { withTimezone: true, mode: 'date' }),
    ...times,
  },
  (t) => [
    uniqueIndex('prospect_email_workspace').on(
      t.workspaceId,
      t.normalizedEmail,
    ),
    index('prospect_workspace_status').on(t.workspaceId, t.status),
  ],
);
export const campaignProspects = pgTable(
  'campaign_prospects',
  {
    id: id(),
    workspaceId: wid(),
    campaignId: text('campaign_id')
      .notNull()
      .references(() => campaigns.id),
    prospectId: text('prospect_id')
      .notNull()
      .references(() => prospects.id),
    currentStep: integer('current_step'),
    status: text('status').notNull(),
    lastContactedAt: timestamp('last_contacted_at', { withTimezone: true, mode: 'date' }),
    ...times,
  },
  (t) => [
    uniqueIndex('campaign_prospect_unique').on(t.campaignId, t.prospectId),
  ],
);
export const replies = pgTable(
  'replies',
  {
    id: id(),
    workspaceId: wid(),
    campaignId: text('campaign_id').references(() => campaigns.id),
    prospectId: text('prospect_id')
      .notNull()
      .references(() => prospects.id),
    provider: text('provider'),
    externalIdCiphertext: text('external_id_ciphertext'),
    subject: text('subject'),
    body: text('body').notNull(),
    providerClassification: text('provider_classification'),
    classification: text('classification'),
    receivedAt: timestamp('received_at', { withTimezone: true, mode: 'date' }).notNull(),
    ...times,
  },
  (t) => [index('replies_workspace_received').on(t.workspaceId, t.receivedAt)],
);
export const messages = pgTable(
  'messages',
  {
    id: id(),
    workspaceId: wid(),
    campaignId: text('campaign_id').references(() => campaigns.id),
    prospectId: text('prospect_id').references(() => prospects.id),
    provider: text('provider'),
    externalIdCiphertext: text('external_id_ciphertext'),
    type: text('type').notNull(),
    fromEmail: text('from_email').notNull(),
    toEmail: text('to_email').notNull(),
    subject: text('subject'),
    body: text('body').notNull(),
    openCount: integer('open_count').notNull().default(0),
    occurredAt: timestamp('occurred_at', { withTimezone: true, mode: 'date' }).notNull(),
    ...times,
  },
  (t) => [index('messages_workspace_time').on(t.workspaceId, t.occurredAt)],
);
export const meetings = pgTable(
  'meetings',
  {
    id: id(),
    workspaceId: wid(),
    prospectId: text('prospect_id')
      .notNull()
      .references(() => prospects.id),
    campaignId: text('campaign_id').references(() => campaigns.id),
    ownerId: text('owner_id').references(() => users.id),
    startsAt: timestamp('starts_at', { withTimezone: true, mode: 'date' }).notNull(),
    timezone: text('timezone').notNull(),
    meetingUrl: text('meeting_url'),
    status: text('status').notNull(),
    notes: text('notes'),
    outcome: text('outcome'),
    ...times,
  },
  (t) => [index('meetings_workspace_start').on(t.workspaceId, t.startsAt)],
);
export const opportunities = pgTable(
  'opportunities',
  {
    id: id(),
    workspaceId: wid(),
    prospectId: text('prospect_id').references(() => prospects.id),
    name: text('name').notNull(),
    ownerId: text('owner_id').references(() => users.id),
    estimatedValue: doublePrecision('estimated_value').notNull().default(0),
    probability: integer('probability').notNull().default(0),
    stage: text('stage').notNull(),
    expectedCloseDate: timestamp('expected_close_date', { withTimezone: true, mode: 'date' }),
    notes: text('notes'),
    ...times,
  },
  (t) => [index('opportunities_workspace_stage').on(t.workspaceId, t.stage)],
);
export const mailboxes = pgTable(
  'mailboxes',
  {
    id: id(),
    workspaceId: wid(),
    email: text('email').notNull(),
    displayName: text('display_name'),
    domain: text('domain').notNull(),
    provider: text('provider'),
    externalIdCiphertext: text('external_id_ciphertext'),
    status: text('status').notNull(),
    dailyLimit: integer('daily_limit'),
    sentToday: integer('sent_today').notNull().default(0),
    health: text('health').notNull(),
    settings: jsonb('settings'),
    lastSyncedAt: timestamp('last_synced_at', { withTimezone: true, mode: 'date' }),
    ...times,
  },
  (t) => [uniqueIndex('mailbox_workspace_email').on(t.workspaceId, t.email)],
);
export const domains = pgTable(
  'domains',
  {
    id: id(),
    workspaceId: wid(),
    domain: text('domain').notNull(),
    status: text('status').notNull(),
    spfStatus: text('spf_status'),
    dkimStatus: text('dkim_status'),
    dmarcStatus: text('dmarc_status'),
    mxStatus: text('mx_status'),
    dkimSelector: text('dkim_selector'),
    lastCheckedAt: timestamp('last_checked_at', { withTimezone: true, mode: 'date' }),
    notes: text('notes'),
    ...times,
  },
  (t) => [uniqueIndex('domain_workspace_unique').on(t.workspaceId, t.domain)],
);
export const files = pgTable(
  'files',
  {
    id: id(),
    workspaceId: wid(),
    storageKey: text('storage_key').notNull().unique(),
    filename: text('filename').notNull(),
    originalFilename: text('original_filename').notNull(),
    contentType: text('content_type').notNull(),
    size: integer('size').notNull(),
    category: text('category').notNull(),
    uploadedBy: text('uploaded_by')
      .notNull()
      .references(() => users.id),
    deletedAt: timestamp('deleted_at', { withTimezone: true, mode: 'date' }),
    ...times,
  },
  (t) => [index('files_workspace').on(t.workspaceId)],
);
export const suppressionEntries = pgTable(
  'suppression_entries',
  {
    id: id(),
    workspaceId: wid(),
    email: text('email').notNull(),
    normalizedEmail: text('normalized_email').notNull(),
    reason: text('reason').notNull(),
    source: text('source').notNull(),
    ...times,
  },
  (t) => [
    uniqueIndex('suppression_workspace_email').on(
      t.workspaceId,
      t.normalizedEmail,
    ),
  ],
);
export const webhookEvents = pgTable(
  'webhook_events',
  {
    id: id(),
    provider: text('provider').notNull(),
    providerEventId: text('provider_event_id').notNull(),
    workspaceId: text('workspace_id'),
    eventType: text('event_type').notNull(),
    payloadCiphertext: text('payload_ciphertext'),
    status: text('status').notNull(),
    processedAt: timestamp('processed_at', { withTimezone: true, mode: 'date' }),
    ...times,
  },
  (t) => [
    uniqueIndex('webhook_provider_event').on(t.provider, t.providerEventId),
  ],
);
export const syncJobs = pgTable(
  'sync_jobs',
  {
    id: id(),
    workspaceId: text('workspace_id'),
    kind: text('kind').notNull(),
    status: text('status').notNull(),
    cursor: text('cursor'),
    recordsProcessed: integer('records_processed').notNull().default(0),
    attemptCount: integer('attempt_count').notNull().default(0),
    safeErrorCode: text('safe_error_code'),
    startedAt: timestamp('started_at', { withTimezone: true, mode: 'date' }),
    finishedAt: timestamp('finished_at', { withTimezone: true, mode: 'date' }),
    ...times,
  },
  (t) => [index('sync_jobs_workspace_status').on(t.workspaceId, t.status)],
);
export const integrations = pgTable(
  'integrations',
  {
    id: id(),
    workspaceId: wid(),
    kind: text('kind').notNull(),
    credentialsCiphertext: text('credentials_ciphertext').notNull(),
    status: text('status').notNull(),
    lastFour: text('last_four'),
    lastSyncedAt: timestamp('last_synced_at', { withTimezone: true, mode: 'date' }),
    ...times,
  },
  (t) => [uniqueIndex('integration_workspace_kind').on(t.workspaceId, t.kind)],
);
export const activityLogs = pgTable(
  'activity_logs',
  {
    id: id(),
    workspaceId: text('workspace_id'),
    actorId: text('actor_id').references(() => users.id),
    action: text('action').notNull(),
    entityType: text('entity_type').notNull(),
    entityId: text('entity_id'),
    metadata: jsonb('metadata'),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).notNull(),
  },
  (t) => [index('activity_workspace_time').on(t.workspaceId, t.createdAt)],
);
