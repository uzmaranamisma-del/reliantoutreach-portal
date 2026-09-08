import {
  campaigns,
  integrations,
  prospects,
  workspaceInvitations,
  workspaceMembers,
  workspaces,
} from '@/db/schema';
import { getWorkspaceContext } from '@/lib/workspace-context';
import {
  deliverWorkspaceInvitation,
  InvitationDeliveryError,
} from '@/lib/invitation-email';
import { and, count, desc, eq } from 'drizzle-orm';

const json = (body: unknown, status = 200) =>
  Response.json(body, { status, headers: { 'Cache-Control': 'no-store' } });
const allowedStatuses = new Set(['trial', 'active', 'paused', 'cancelled']);
function verifyOrigin(request: Request) {
  const origin = request.headers.get('origin');
  return !origin || origin === new URL(request.url).origin;
}

export async function GET() {
  const context = await getWorkspaceContext();
  if (!context) return json({ error: 'Authentication required' }, 401);
  if (context.role !== 'super_admin')
    return json({ error: 'Super Admin access required' }, 403);
  const rows = await context.db
    .select()
    .from(workspaces)
    .orderBy(workspaces.createdAt)
    .limit(500);
  const clients = await Promise.all(
    rows.map(async (workspace) => {
      const [
        [campaignTotal],
        [prospectTotal],
        [memberTotal],
        [connection],
        [pendingInvite],
      ] = await Promise.all([
        context.db
          .select({ value: count() })
          .from(campaigns)
          .where(eq(campaigns.workspaceId, workspace.id)),
        context.db
          .select({ value: count() })
          .from(prospects)
          .where(eq(prospects.workspaceId, workspace.id)),
        context.db
          .select({ value: count() })
          .from(workspaceMembers)
          .where(
            and(
              eq(workspaceMembers.workspaceId, workspace.id),
              eq(workspaceMembers.status, 'active'),
            ),
          ),
        context.db
          .select({
            status: integrations.status,
            lastSyncedAt: integrations.lastSyncedAt,
          })
          .from(integrations)
          .where(
            and(
              eq(integrations.workspaceId, workspace.id),
              eq(integrations.kind, 'outreach'),
            ),
          )
          .limit(1),
        context.db
          .select({ email: workspaceInvitations.email })
          .from(workspaceInvitations)
          .where(
            and(
              eq(workspaceInvitations.workspaceId, workspace.id),
              eq(workspaceInvitations.status, 'pending'),
            ),
          )
          .limit(1),
      ]);
      return {
        id: workspace.id,
        name: workspace.name,
        primaryContactEmail: workspace.primaryContactEmail,
        slug: workspace.slug,
        status: workspace.status,
        packageName: workspace.packageName,
        monthlyCredits: workspace.monthlyCredits,
        monthlyEmailCapacity: workspace.monthlyEmailCapacity,
        priceCents: workspace.priceCents,
        renewalDate: workspace.renewalDate?.toISOString() ?? null,
        accountManager: workspace.accountManager,
        campaigns: campaignTotal.value,
        prospects: prospectTotal.value,
        members: memberTotal.value,
        integrationStatus: connection?.status ?? 'not_connected',
        lastSyncedAt: connection?.lastSyncedAt?.toISOString() ?? null,
        pendingInvite: pendingInvite?.email ?? null,
        createdAt: workspace.createdAt.toISOString(),
      };
    }),
  );
  return json({ currentWorkspaceId: context.workspaceId, clients });
}

export async function POST(request: Request) {
  const context = await getWorkspaceContext();
  if (!context) return json({ error: 'Authentication required' }, 401);
  if (context.role !== 'super_admin')
    return json({ error: 'Super Admin access required' }, 403);
  if (!verifyOrigin(request))
    return json({ error: 'Request could not be verified' }, 403);
  let body: {
    name?: string;
    clientEmail?: string;
    packageName?: string;
    monthlyCredits?: number;
    monthlyEmailCapacity?: number;
    price?: number;
    renewalDate?: string;
    accountManager?: string;
  };
  try {
    body = await request.json();
  } catch {
    return json({ error: 'Invalid request' }, 400);
  }
  const name = body.name?.trim();
  const clientEmail = body.clientEmail?.trim().toLowerCase() ?? '';
  if (!name || name.length > 120)
    return json({ error: 'Enter a client name.' }, 400);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clientEmail))
    return json({ error: 'Enter a valid client email address.' }, 400);
  const monthlyCredits = Number(body.monthlyCredits ?? 10000);
  const monthlyEmailCapacity = Number(body.monthlyEmailCapacity ?? 10000);
  const price = Number(body.price ?? 0);
  if (
    !Number.isInteger(monthlyCredits) ||
    monthlyCredits < 0 ||
    monthlyCredits > 100000000
  )
    return json({ error: 'Enter valid monthly credits.' }, 400);
  if (
    !Number.isInteger(monthlyEmailCapacity) ||
    monthlyEmailCapacity < 0 ||
    monthlyEmailCapacity > 100000000
  )
    return json({ error: 'Enter a valid monthly email allowance.' }, 400);
  if (!Number.isFinite(price) || price < 0 || price > 10000000)
    return json({ error: 'Enter a valid package price.' }, 400);
  const [emailIntegration] = await context.db
    .select({ credentialsCiphertext: integrations.credentialsCiphertext })
    .from(integrations)
    .where(
      and(
        eq(integrations.kind, 'invitation_email'),
        eq(integrations.status, 'configured'),
      ),
    )
    .orderBy(desc(integrations.updatedAt))
    .limit(1);
  const now = new Date();
  const id = crypto.randomUUID();
  const slug = `${
    name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '')
      .slice(0, 45) || 'client'
  }-${id.slice(0, 6)}`;
  await context.db.insert(workspaces).values({
    id,
    name,
    primaryContactEmail: clientEmail,
    slug,
    status: 'active',
    packageName: body.packageName?.trim() || 'Launch',
    monthlyCredits,
    monthlyEmailCapacity,
    priceCents: Math.round(price * 100),
    renewalDate: body.renewalDate
      ? new Date(`${body.renewalDate}T00:00:00Z`)
      : null,
    accountManager: body.accountManager?.trim() || null,
    createdAt: now,
    updatedAt: now,
  });
  const invitationId = crypto.randomUUID();
  await context.db.insert(workspaceInvitations).values({
    id: invitationId,
    workspaceId: id,
    email: clientEmail,
    role: 'client_admin',
    tokenHash: crypto.randomUUID(),
    status: 'pending',
    invitedByUserId: context.userId,
    expiresAt: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000),
    createdAt: now,
    updatedAt: now,
  });
  if (!emailIntegration)
    return json(
      {
        created: true,
        id,
        invitationDelivered: false,
        warning:
          'Workspace created and invitation prepared. Connect invitation email delivery in Settings, then resend it from Team.',
      },
      201,
    );
  try {
    await deliverWorkspaceInvitation({
      credentialsCiphertext: emailIntegration.credentialsCiphertext,
      email: clientEmail,
      invitationId,
      portalUrl: new URL(request.url).origin,
      role: 'client_admin',
      workspaceName: name,
    });
    return json({ created: true, id, invitationDelivered: true }, 201);
  } catch (error) {
    console.error(
      JSON.stringify({
        event: 'client_invitation_delivery_failed',
        code:
          error instanceof InvitationDeliveryError
            ? error.providerCode || `HTTP_${error.status}`
            : error instanceof Error
              ? error.name
              : 'UNKNOWN',
      }),
    );
    return json(
      {
        created: true,
        id,
        invitationDelivered: false,
        warning:
          'Workspace created, but the invitation email could not be delivered. You can resend it from Team.',
      },
      201,
    );
  }
}

export async function PATCH(request: Request) {
  const context = await getWorkspaceContext();
  if (!context) return json({ error: 'Authentication required' }, 401);
  if (context.role !== 'super_admin')
    return json({ error: 'Super Admin access required' }, 403);
  if (!verifyOrigin(request))
    return json({ error: 'Request could not be verified' }, 403);
  let body: {
    id?: string;
    status?: string;
    primaryContactEmail?: string;
    packageName?: string;
    monthlyCredits?: number;
    monthlyEmailCapacity?: number;
    price?: number;
    renewalDate?: string | null;
    accountManager?: string;
  };
  try {
    body = await request.json();
  } catch {
    return json({ error: 'Invalid request' }, 400);
  }
  if (!body.id || (body.status && !allowedStatuses.has(body.status)))
    return json({ error: 'Invalid client update.' }, 400);
  const values: Record<string, unknown> = { updatedAt: new Date() };
  if (body.status) values.status = body.status;
  if (body.primaryContactEmail !== undefined) {
    const email = body.primaryContactEmail.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
      return json({ error: 'Enter a valid client email address.' }, 400);
    values.primaryContactEmail = email;
  }
  if (body.packageName)
    values.packageName = body.packageName.trim().slice(0, 80);
  if (body.monthlyCredits !== undefined)
    values.monthlyCredits = Math.max(
      0,
      Math.min(100000000, Math.round(body.monthlyCredits)),
    );
  if (body.monthlyEmailCapacity !== undefined)
    values.monthlyEmailCapacity = Math.max(
      0,
      Math.min(100000000, Math.round(body.monthlyEmailCapacity)),
    );
  if (body.price !== undefined)
    values.priceCents = Math.max(
      0,
      Math.min(1000000000, Math.round(body.price * 100)),
    );
  if (body.accountManager !== undefined)
    values.accountManager = body.accountManager.trim().slice(0, 120) || null;
  if (body.renewalDate !== undefined)
    values.renewalDate = body.renewalDate
      ? new Date(`${body.renewalDate}T00:00:00Z`)
      : null;
  const updated = await context.db
    .update(workspaces)
    .set(values)
    .where(eq(workspaces.id, body.id))
    .returning({ id: workspaces.id });
  return updated.length
    ? json({ updated: true })
    : json({ error: 'Client not found.' }, 404);
}
