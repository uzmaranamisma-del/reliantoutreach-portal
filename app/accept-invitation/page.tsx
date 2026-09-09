import {
  chatGPTSignOutPath,
  requireChatGPTUser,
} from '@/app/chatgpt-auth';
import { getDb } from '@/db';
import {
  users,
  workspaceInvitations,
  workspaceMembers,
  workspaces,
} from '@/db/schema';
import { hashInvitationToken } from '@/lib/invitation-token';
import { and, eq, gt } from 'drizzle-orm';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { AlertTriangle, ArrowRight } from 'lucide-react';

export const dynamic = 'force-dynamic';

function InvitationMessage({
  title,
  message,
  actionHref = '/login',
  actionLabel = 'Return to sign in',
}: {
  title: string;
  message: string;
  actionHref?: string;
  actionLabel?: string;
}) {
  return (
    <main className="auth-page">
      <section className="auth-brand">
        <a href="/login" className="auth-logo">
          <b>R</b>
          <span>
            <strong>Reliant</strong>
            <small>OUTREACH</small>
          </span>
        </a>
        <div>
          <p>PRIVATE CLIENT PORTAL</p>
          <h1>Your outreach operation, securely prepared for you.</h1>
        </div>
      </section>
      <section className="auth-form">
        <div className="auth-card">
          <span className="auth-lock">
            <AlertTriangle />
          </span>
          <h2>{title}</h2>
          <p>{message}</p>
          <a className="auth-primary" href={actionHref} target="_top">
            {actionLabel} <ArrowRight />
          </a>
        </div>
      </section>
    </main>
  );
}

export default async function AcceptInvitationPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const token = (await searchParams).token?.trim() ?? '';
  const invitationPath = `/accept-invitation?token=${encodeURIComponent(token)}`;
  if (!/^[a-f0-9]{64}$/i.test(token))
    return (
      <InvitationMessage
        title="Invitation link is invalid"
        message="Ask ReliantOutreach to send you a fresh private invitation."
      />
    );

  const auth = await requireChatGPTUser(invitationPath);
  const db = getDb();
  const now = new Date();
  const tokenHash = await hashInvitationToken(token);
  const [invitation] = await db
    .select({
      id: workspaceInvitations.id,
      workspaceId: workspaceInvitations.workspaceId,
      workspaceName: workspaces.name,
      email: workspaceInvitations.email,
      role: workspaceInvitations.role,
    })
    .from(workspaceInvitations)
    .innerJoin(workspaces, eq(workspaces.id, workspaceInvitations.workspaceId))
    .where(
      and(
        eq(workspaceInvitations.tokenHash, tokenHash),
        eq(workspaceInvitations.status, 'pending'),
        gt(workspaceInvitations.expiresAt, now),
        eq(workspaces.status, 'active'),
      ),
    )
    .limit(1);

  if (!invitation)
    return (
      <InvitationMessage
        title="Invitation has expired"
        message="This invitation is no longer active. Ask ReliantOutreach to resend it."
      />
    );
  if (invitation.email.toLowerCase() !== auth.email.toLowerCase())
    return (
      <InvitationMessage
        title="Use the invited email account"
        message={`This private invitation was sent to ${invitation.email}. Sign in using that email address.`}
        actionHref={chatGPTSignOutPath(invitationPath)}
        actionLabel="Switch to invited account"
      />
    );

  const userId = `user:${auth.userId}`;
  await db
    .insert(users)
    .values({
      id: userId,
      authSubject: auth.userId,
      email: auth.email.toLowerCase(),
      name: auth.fullName,
      createdAt: now,
      updatedAt: now,
    })
    .onConflictDoUpdate({
      target: users.authSubject,
      set: {
        email: auth.email.toLowerCase(),
        name: auth.fullName,
        updatedAt: now,
      },
    });
  await db
    .insert(workspaceMembers)
    .values({
      id: crypto.randomUUID(),
      workspaceId: invitation.workspaceId,
      userId,
      role: invitation.role,
      status: 'active',
      createdAt: now,
      updatedAt: now,
    })
    .onConflictDoUpdate({
      target: [workspaceMembers.workspaceId, workspaceMembers.userId],
      set: { role: invitation.role, status: 'active', updatedAt: now },
    });
  await db
    .update(workspaceInvitations)
    .set({ status: 'accepted', acceptedAt: now, updatedAt: now })
    .where(eq(workspaceInvitations.id, invitation.id));
  const cookieStore = await cookies();
  cookieStore.set('reliant_workspace', invitation.workspaceId, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 60 * 60 * 24 * 365,
  });
  cookieStore.delete('reliant_client_preview');
  redirect('/dashboard?invitation=accepted');
}
