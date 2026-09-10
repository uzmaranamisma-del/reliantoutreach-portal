# ReliantOutreach Portal

Private-label, multi-tenant outreach operations portal for ReliantOutreach clients. The application uses Next.js, Supabase Auth, PostgreSQL, and server-only provider integrations. External infrastructure names, credentials, URLs, and IDs are never exposed in the client UI.

## Architecture

- Next.js App Router with TypeScript and Tailwind CSS
- PostgreSQL with Drizzle ORM
- Supabase Auth for email/password sessions and invitation onboarding
- Workspace-scoped authorization in every server route
- Server-only encrypted outreach credentials
- Local database-backed dashboards so provider outages do not break the client portal
- Background/manual synchronization endpoints with stored sync status

## Local setup

1. Install Node.js 22 and run `npm ci`.
2. Copy `.env.example` to `.env.local` and fill in the values.
3. Create a Supabase project and copy its database and Auth credentials.
4. Run `npm run db:migrate`.
5. Start the app with `npm run dev`.

Open `http://localhost:3000/setup-admin` and create the first administrator using an email included in `SUPER_ADMIN_EMAILS`. The address must be verified from the email Supabase sends before the account can access the portal. The setup route disables itself after the first configured administrator exists.

## Environment variables

- `APP_URL`: public application URL, such as `https://app.reliantoutreach.com`
- `DATABASE_URL`: Supabase PostgreSQL connection string
- `NEXT_PUBLIC_SUPABASE_URL`: Supabase project URL
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`: Supabase public publishable key
- `SUPABASE_SECRET_KEY`: server-only Supabase secret key
- `SUPER_ADMIN_EMAILS`: comma-separated internal administrator emails
- `ENCRYPTION_KEY`: 32-byte base64 or 64-character hex key used for stored credentials
- `WEBHOOK_SECRET`: secret used to validate inbound webhook requests
- `SENTRY_DSN`: optional production monitoring DSN

Never commit `.env.local` or any real credential. Provider keys are entered by an administrator, encrypted before storage, and never returned to clients.

## Database

Generate a migration after schema changes with `npm run db:generate`. Apply committed migrations with `npm run db:migrate`. Production builds automatically apply pending committed migrations when `DATABASE_URL` is configured. The PostgreSQL migrations live in `drizzle-pg/`; the older `drizzle/` directory is retained only as historical migration data and is not used by the production configuration.

All business records are workspace-owned. PostgreSQL row-level security is enabled as a defense-in-depth boundary, while application routes also enforce authentication, workspace membership, and role permissions.

## Authentication and invitations

The portal is invite-only. A super admin creates the client workspace, stores the client-specific outreach key, performs the initial sync, and sends the invitation. The client opens the link, chooses a password for the invited email address, and is then routed directly to their isolated workspace. Public self-registration is not enabled.

## Quality checks

Run before deployment:

```bash
npm run lint
npm run typecheck
npm test
npm run build
```

Automated tests must never call a production outreach API. Use fixtures and mocks for integration tests.

## Production deployment

See [Hostinger deployment](docs/HOSTINGER_DEPLOYMENT.md) for the GitHub-to-Hostinger setup, Supabase configuration, environment variables, domain connection, and deployment checks.

## Troubleshooting

- **Login returns to the wrong account:** sign out of the existing browser session and open the invitation using the invited email.
- **Invitation email is missing:** verify the email provider key, sender domain, `APP_URL`, and spam folder.
- **Data does not synchronize:** verify the client-specific key, inspect the admin sync status, and keep serving the last stored data while retrying.
- **Database connection fails:** use the Supabase pooler URL when the hosting network does not support direct IPv6 database connections.
