# ReliantOutreach architecture

## System shape
The product uses a tenant-aware application core with provider adapters. Browser routes never call sending infrastructure directly. Background jobs and verified webhooks update the local operational database; dashboards read local records so an infrastructure outage affects freshness rather than availability.

- Presentation: App Router routes, server components by default, client components only for interaction.
- Services: authorization, imports, campaign/reply workflows, reporting, private files, notifications and audit logging.
- Persistence: relational records in SQL and private object storage for uploads.
- Jobs: durable workers for imports, sync, webhook processing, rollups and DNS checks.
- Integrations: a server-only `OutreachProvider` contract and concrete adapters.

## Route structure
Authentication: `/login`, `/forgot-password`, `/reset-password`, `/accept-invitation`, `/verify-email`, `/unauthorized`.

Workspace: `/dashboard`, `/prospects`, `/prospects/[id]`, `/campaigns`, `/campaigns/[id]`, `/replies`, `/email-accounts`, `/domains`, `/meetings`, `/analytics`, `/files`, `/team`, `/settings`.

Administration: `/admin/clients`, `/admin/clients/[id]`, `/admin/infrastructure`, `/admin/integrations`, `/admin/system-logs`.

Server: `/api/imports`, `/api/exports`, `/api/files`, `/api/webhooks/outreach`, `/api/sync`, `/api/dns-checks`.

## Component structure
Shared components include `AppSidebar`, `TopBar`, `WorkspaceSwitcher`, `PageHeader`, `MetricCard`, `StatusBadge`, `FilterBar`, `DataTable`, `ChartCard`, `EmptyState`, `ConfirmDialog`, and `NotificationMenu`. Feature components include `ProspectDrawer`, `ImportWizard`, `CampaignOverview`, `SequenceTimeline`, `ReplyWorkspace`, `DomainHealth`, and `FileUploader`.

## Permissions and tenancy
Authorization is deny-by-default and evaluated server-side using authenticated user, requested workspace, active membership and role. Super admins have global access; account managers have assigned workspaces; client admins have configurable write capabilities; client viewers are read-only. Every tenant-owned row includes `workspace_id`. Object keys are workspace-prefixed and downloads use short-lived signed URLs. Database policies mirror service authorization. Impersonation is explicit, visible and audited.

## Provider integration
The provider interface supports campaign, prospect, reply and mailbox reads plus sync and webhook normalization. External identifiers are separate from public UUIDs and excluded from client serializers. Endpoints are added only after current official documentation is verified. Unsupported capabilities return a typed internal result; user-facing copy says “Managed through outreach infrastructure.” Technical errors map to client-safe messages.

## Data synchronization
Verified webhooks enter an idempotency ledger and are acknowledged quickly. Workers normalize events into internal records transactionally. Periodic incremental sync uses cursors and bounded batches as fallback. Jobs record state, attempts, processed records, safe error codes and timestamps. Dashboard queries use local facts and rollups with a last-updated timestamp.

## Environment
Production uses `APP_URL`, database and private-storage bindings, authentication configuration, `OUTREACH_API_KEY`, `OUTREACH_API_BASE_URL`, `WEBHOOK_SECRET`, `ENCRYPTION_KEY`, optional `EMAIL_PROVIDER_KEY`, and optional monitoring DSN. Secrets remain server-only and are never logged.

## Development phases
1. Foundation: schema, authentication, tenancy, authorization, app shell and dashboard.
2. Core operations: clients, prospects, campaigns, CSV import and replies.
3. Infrastructure: mailboxes, domains, DNS checks, meetings and private files.
4. Provider sync: documented reads, webhook ingestion, jobs and admin health.
5. Hardening: audit logs, notifications, exports, tests, monitoring, accessibility and deployment documentation.
