# Deploy ReliantOutreach on Hostinger

## 1. Create the Supabase backend

1. Create a Supabase project.
2. In **Project Settings > Database**, copy the PostgreSQL connection string. Prefer the transaction/session pooler URL on shared hosting.
3. In **Project Settings > API**, copy the project URL, anon key, and service role key.
4. In **Authentication > URL Configuration**, set:
   - Site URL: `https://app.reliantoutreach.com`
   - Redirect URL: `https://app.reliantoutreach.com/**`
5. In **Authentication > Users**, create the first ReliantOutreach admin user and confirm the email.

Run the schema once from a trusted computer:

```bash
npm ci
npm run db:migrate
```

## 2. Create the Hostinger application

In hPanel, create a Node.js application (or use the VPS Node.js deployment flow) and connect:

- Repository: `uzmaranamisma-del/reliantoutreach-portal`
- Branch: `main`
- Node.js: 22
- Install command: `npm ci`
- Build command: `npm run build`
- Start command: `npm start`
- Application port: `3000` or the `PORT` value injected by Hostinger

If the Hostinger plan only supports static websites, upgrade/use a Node.js-capable Web App or VPS plan. This portal cannot be deployed as static HTML because login, invitations, encryption, sync, and database routes run on the server.

## 3. Add environment variables in Hostinger

Add every value from `.env.example` in the application environment settings. Production essentials are:

```text
APP_URL=https://app.reliantoutreach.com
DATABASE_URL=postgresql://...
NEXT_PUBLIC_SUPABASE_URL=https://....supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
SUPER_ADMIN_EMAILS=info@reliantoutreach.com
ENCRYPTION_KEY=...
WEBHOOK_SECRET=...
```

Keep service-role, encryption, webhook, email, and outreach keys server-only. Do not prefix them with `NEXT_PUBLIC_`.

Generate production secrets locally:

```bash
openssl rand -base64 32
openssl rand -hex 32
```

Use one output as `ENCRYPTION_KEY` and another as `WEBHOOK_SECRET`.

## 4. Connect the domain

1. Add `app.reliantoutreach.com` as the application domain in Hostinger.
2. In the DNS zone for `reliantoutreach.com`, create the CNAME or A record shown by Hostinger.
3. Remove conflicting records for the `app` hostname.
4. Wait for DNS propagation and enable Hostinger SSL.
5. Confirm `https://app.reliantoutreach.com/login` loads without a certificate warning.

## 5. Configure email invitations

Add the email provider key and verified sender address in the super-admin Settings page. The sender must use the already-verified ReliantOutreach domain. Send a test invitation to a new email address and confirm the invitation link uses `https://app.reliantoutreach.com`.

## 6. Production verification

1. Sign in as the super admin.
2. Create a test client and package.
3. Add the client's outreach API key and run the initial sync.
4. Send an invite to a private/incognito browser email account.
5. Set the invited user's password.
6. Confirm the client cannot see Clients, global Settings, provider details, or another workspace.
7. Confirm campaigns, prospects, replies, email accounts, domains, and stored metrics belong only to the assigned workspace.
8. Confirm refreshes show stored data immediately while synchronization happens server-side.

After future pushes to `main`, Hostinger can automatically rebuild and redeploy the application. Database migrations should be applied deliberately before or during a release; never mutate the production schema manually.
