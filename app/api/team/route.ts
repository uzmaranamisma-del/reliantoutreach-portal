import {
  integrations,
  users,
  workspaceInvitations,
  workspaceMembers,
} from '@/db/schema';
import {
  deliverWorkspaceInvitation,
  InvitationDeliveryError,
} from '@/lib/invitation-email';
import { getWorkspaceContext } from '@/lib/workspace-context';
import {
  createInvitationToken,
  hashInvitationToken,
} from '@/lib/invitation-token';
import { and, desc, eq } from 'drizzle-orm';

export async function GET() {
  const context = await getWorkspaceContext();
  if (!context)
    return Response.json(
      { error: 'Authentication required.' },
      { status: 401 },
    );

  const members = await context.db
    .select({
      id: workspaceMembers.id,
      name: users.name,
      email: users.email,
      role: workspaceMembers.role,
      status: workspaceMembers.status,
      updatedAt: workspaceMembers.updatedAt,
    })
    .from(workspaceMembers)
    .innerJoin(users, eq(users.id, workspaceMembers.userId))
    .where(eq(workspaceMembers.workspaceId, context.workspaceId));
  const invitations = await context.db
    .select({
      id: workspaceInvitations.id,
      email: workspaceInvitations.email,
      role: workspaceInvitations.role,
      status: workspaceInvitations.status,
      expiresAt: workspaceInvitations.expiresAt,
    })
    .from(workspaceInvitations)
    .where(
      and(
        eq(workspaceInvitations.workspaceId, context.workspaceId),
        eq(workspaceInvitations.status, 'pending'),
      ),
    )
    .orderBy(desc(workspaceInvitations.createdAt));
  return Response.json({ members, invitations });
}

export async function POST(request: Request) {
  const context = await getWorkspaceContext();
  if (!context)
    return Response.json(
      { error: 'Authentication required.' },
      { status: 401 },
    );
  if (
    !['super_admin', 'account_manager', 'client_admin'].includes(context.role)
  )
    return Response.json(
      { error: 'You do not have permission to invite members.' },
      { status: 403 },
    );
  const origin = request.headers.get('origin');
  if (origin && origin !== new URL(request.url).origin)
    return Response.json(
      { error: 'Request could not be verified.' },
      { status: 403 },
    );

  const body = (await request.json().catch(() => null)) as {
    email?: string;
    role?: string;
  } | null;
  const email = body?.email?.trim().toLowerCase() ?? '';
  const role = body?.role;
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
    return Response.json(
      { error: 'Enter a valid email address.' },
      { status: 400 },
    );
  if (role !== 'client_admin' && role !== 'client_viewer')
    return Response.json(
      { error: 'Select a valid client role.' },
      { status: 400 },
    );

  const now = new Date();
  const existingUser = await context.db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, email))
    .limit(1);
  if (existingUser[0]) {
    const existingMember = await context.db
      .select({ id: workspaceMembers.id })
      .from(workspaceMembers)
      .where(
        and(
          eq(workspaceMembers.workspaceId, context.workspaceId),
          eq(workspaceMembers.userId, existingUser[0].id),
        ),
      )
      .limit(1);
    if (existingMember[0])
      return Response.json(
        { error: 'This person is already a workspace member.' },
        { status: 409 },
      );
  }

  await context.db
    .update(workspaceInvitations)
    .set({ status: 'cancelled', updatedAt: now })
    .where(
      and(
        eq(workspaceInvitations.workspaceId, context.workspaceId),
        eq(workspaceInvitations.email, email),
        eq(workspaceInvitations.status, 'pending'),
      ),
    );
  let [emailIntegration] = await context.db
    .select({ credentialsCiphertext: integrations.credentialsCiphertext })
    .from(integrations)
    .where(
      and(
        eq(integrations.workspaceId, context.workspaceId),
        eq(integrations.kind, 'invitation_email'),
        eq(integrations.status, 'configured'),
      ),
    )
    .orderBy(desc(integrations.updatedAt))
    .limit(1);

  // Invitation delivery is platform infrastructure. Client workspaces usually do
  // not store their own mail credential, so fall back to the latest configured
  // ReliantOutreach sender without exposing it to the inviting user.
  if (!emailIntegration) {
    [emailIntegration] = await context.db
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
  }
  if (!emailIntegration)
    return Response.json(
      { error: 'Set up invitation email delivery in Settings first.' },
      { status: 409 },
    );

  const invitationId = crypto.randomUUID();
  const invitationToken = createInvitationToken();
  await context.db.insert(workspaceInvitations).values({
    id: invitationId,
    workspaceId: context.workspaceId,
    email,
    role,
    tokenHash: await hashInvitationToken(invitationToken),
    status: 'pending',
    invitedByUserId: context.userId,
    expiresAt: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000),
    createdAt: now,
    updatedAt: now,
  });

  try {
    await deliverWorkspaceInvitation({
      credentialsCiphertext: emailIntegration.credentialsCiphertext,
      email,
      invitationId,
      invitationToken,
      portalUrl: new URL(request.url).origin,
      role,
      workspaceName: context.workspaceName,
    });
  } catch (error) {
    console.error(
      JSON.stringify({
        event: 'invitation_delivery_failed',
        code:
          error instanceof InvitationDeliveryError
            ? error.providerCode || `HTTP_${error.status}`
            : error instanceof Error
              ? error.name
              : 'UNKNOWN',
      }),
    );
    await context.db
      .update(workspaceInvitations)
      .set({ status: 'failed', updatedAt: new Date() })
      .where(eq(workspaceInvitations.id, invitationId));
    return Response.json(
      {
        error: 'Invitation email could not be delivered. Check email settings.',
      },
      { status: 502 },
    );
  }
  return Response.json({ invited: true, email, delivered: true });
}
