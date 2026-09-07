import {
  integrations,
  users,
  workspaceInvitations,
  workspaceMembers,
} from '@/db/schema';
import { decryptSecret } from '@/lib/crypto';
import { getWorkspaceContext } from '@/lib/workspace-context';
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
  const [emailIntegration] = await context.db
    .select({ credentialsCiphertext: integrations.credentialsCiphertext })
    .from(integrations)
    .where(
      and(
        eq(integrations.workspaceId, context.workspaceId),
        eq(integrations.kind, 'invitation_email'),
      ),
    )
    .limit(1);
  if (!emailIntegration)
    return Response.json(
      { error: 'Set up invitation email delivery in Settings first.' },
      { status: 409 },
    );

  const invitationId = crypto.randomUUID();
  await context.db.insert(workspaceInvitations).values({
    id: invitationId,
    workspaceId: context.workspaceId,
    email,
    role,
    tokenHash: crypto.randomUUID(),
    status: 'pending',
    invitedByUserId: context.userId,
    expiresAt: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000),
    createdAt: now,
    updatedAt: now,
  });

  try {
    const credentials = JSON.parse(
      await decryptSecret(emailIntegration.credentialsCiphertext),
    ) as { apiKey: string; fromEmail: string };
    const portalUrl = new URL(request.url).origin;
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${credentials.apiKey}`,
        'Content-Type': 'application/json',
        'Idempotency-Key': `workspace-invite-${invitationId}`,
        'User-Agent': 'ReliantOutreach Portal/1.0',
      },
      body: JSON.stringify({
        from: `ReliantOutreach <${credentials.fromEmail}>`,
        to: [email],
        subject: `You are invited to ${context.workspaceName}`,
        html: `<div style="font-family:Arial,sans-serif;max-width:560px;margin:auto;padding:32px;color:#0e2317"><div style="display:inline-grid;place-items:center;width:38px;height:38px;border-radius:10px;background:#c8f169;font-weight:800">R</div><h1 style="font-size:24px">You are invited to ReliantOutreach</h1><p>You have been invited to join <strong>${context.workspaceName.replaceAll('<', '&lt;').replaceAll('>', '&gt;')}</strong> as ${role === 'client_admin' ? 'Client Admin' : 'Client Viewer'}.</p><a href="${portalUrl}/login" style="display:inline-block;margin-top:16px;padding:12px 18px;border-radius:10px;background:#0e2317;color:#fff;text-decoration:none;font-weight:700">Accept invitation</a><p style="margin-top:24px;color:#6b7a70;font-size:13px">Use ${email} when signing in. This invitation expires in 7 days.</p></div>`,
      }),
      signal: AbortSignal.timeout(15_000),
    });
    if (!response.ok) throw new Error('EMAIL_DELIVERY_FAILED');
  } catch {
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
