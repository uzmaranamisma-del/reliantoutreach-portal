import { getChatGPTUser } from '@/app/chatgpt-auth';
import { getDb } from '@/db';
import {
  users,
  workspaceInvitations,
  workspaceMembers,
  workspaces,
} from '@/db/schema';
import { and, eq, gt } from 'drizzle-orm';
import { cookies } from 'next/headers';

const LOCAL_SITE_OWNER_EMAIL = 'seedy@sites.test';

function isConfiguredSuperAdmin(email: string) {
  const configured = (process.env.SUPER_ADMIN_EMAILS ?? '')
    .split(',')
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean);
  return (
    email.toLowerCase() === LOCAL_SITE_OWNER_EMAIL ||
    configured.includes(email.toLowerCase())
  );
}

export async function getWorkspaceContext() {
  const auth = await getChatGPTUser();
  if (!auth) return null;
  const db = getDb();
  const now = new Date();
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

  let [membership] = await db
    .select({
      workspaceId: workspaceMembers.workspaceId,
      workspaceName: workspaces.name,
      role: workspaceMembers.role,
    })
    .from(workspaceMembers)
    .innerJoin(workspaces, eq(workspaces.id, workspaceMembers.workspaceId))
    .where(
      and(
        eq(workspaceMembers.userId, userId),
        eq(workspaceMembers.status, 'active'),
        eq(workspaces.status, 'active'),
      ),
    )
    .limit(1);

  const configuredSuperAdmin = isConfiguredSuperAdmin(auth.email);

  // The Sites development identity represents the portal owner. In production,
  // SUPER_ADMIN_EMAILS explicitly identifies ReliantOutreach operators.
  if (membership && configuredSuperAdmin && membership.role !== 'super_admin') {
    await db
      .update(workspaceMembers)
      .set({ role: 'super_admin', updatedAt: now })
      .where(
        and(
          eq(workspaceMembers.userId, userId),
          eq(workspaceMembers.workspaceId, membership.workspaceId),
        ),
      );
    membership = { ...membership, role: 'super_admin' };
  }

  // Accept a matching pending invite even if this identity previously visited
  // the portal and already owns a personal workspace.
  const [invitation] = await db
    .select()
    .from(workspaceInvitations)
    .where(
      and(
        eq(workspaceInvitations.email, auth.email.toLowerCase()),
        eq(workspaceInvitations.status, 'pending'),
        gt(workspaceInvitations.expiresAt, now),
      ),
    )
    .limit(1);
  if (invitation) {
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
      .onConflictDoNothing();
    await db
      .update(workspaceInvitations)
      .set({ status: 'accepted', acceptedAt: now, updatedAt: now })
      .where(eq(workspaceInvitations.id, invitation.id));
    if (!configuredSuperAdmin) {
      const [invitedMembership] = await db
        .select({
          workspaceId: workspaceMembers.workspaceId,
          workspaceName: workspaces.name,
          role: workspaceMembers.role,
        })
        .from(workspaceMembers)
        .innerJoin(workspaces, eq(workspaces.id, workspaceMembers.workspaceId))
        .where(
          and(
            eq(workspaceMembers.userId, userId),
            eq(workspaceMembers.workspaceId, invitation.workspaceId),
          ),
        )
        .limit(1);
      membership = invitedMembership;
    }
  }

  const [globalAdmin] = await db
    .select({
      workspaceId: workspaceMembers.workspaceId,
      workspaceName: workspaces.name,
    })
    .from(workspaceMembers)
    .innerJoin(workspaces, eq(workspaces.id, workspaceMembers.workspaceId))
    .where(
      and(
        eq(workspaceMembers.userId, userId),
        eq(workspaceMembers.role, 'super_admin'),
        eq(workspaceMembers.status, 'active'),
        eq(workspaces.status, 'active'),
      ),
    )
    .limit(1);
  let isImpersonating = false;
  if (globalAdmin) {
    const cookieStore = await cookies();
    const selectedId = cookieStore.get('reliant_workspace')?.value;
    const previewId = cookieStore.get('reliant_client_preview')?.value;
    if (selectedId) {
      const [selected] = await db
        .select({
          workspaceId: workspaces.id,
          workspaceName: workspaces.name,
        })
        .from(workspaces)
        .where(
          and(eq(workspaces.id, selectedId), eq(workspaces.status, 'active')),
        )
        .limit(1);
      if (selected) {
        isImpersonating = previewId === selectedId;
        membership = {
          ...selected,
          role: isImpersonating ? 'client_admin' : 'super_admin',
        };
      } else membership = { ...globalAdmin, role: 'super_admin' };
    } else {
      membership = { ...globalAdmin, role: 'super_admin' };
    }
  }

  if (!membership) {
    const workspaceId = `workspace:${auth.userId}`;
    const identity = auth.fullName?.trim() || auth.email.split('@')[0];
    await db
      .insert(workspaces)
      .values({
        id: workspaceId,
        name: `${identity}'s Workspace`,
        slug: `workspace-${auth.userId.replace(/[^a-zA-Z0-9]/g, '').slice(0, 24)}`,
        status: 'active',
        createdAt: now,
        updatedAt: now,
      })
      .onConflictDoNothing();
    await db
      .insert(workspaceMembers)
      .values({
        id: `member:${auth.userId}`,
        workspaceId,
        userId,
        role: 'client_admin',
        status: 'active',
        createdAt: now,
        updatedAt: now,
      })
      .onConflictDoNothing();
    membership = {
      workspaceId,
      workspaceName: `${identity}'s Workspace`,
      role: configuredSuperAdmin ? 'super_admin' : 'client_admin',
    };

    if (membership.role === 'super_admin') {
      await db
        .update(workspaceMembers)
        .set({ role: 'super_admin', updatedAt: now })
        .where(
          and(
            eq(workspaceMembers.userId, userId),
            eq(workspaceMembers.workspaceId, workspaceId),
          ),
        );
    }
  }

  return { db, auth, userId, isImpersonating, ...membership };
}
