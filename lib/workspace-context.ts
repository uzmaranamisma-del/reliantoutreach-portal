import { getChatGPTUser } from '@/app/chatgpt-auth';
import { getDb } from '@/db';
import { users, workspaceMembers, workspaces } from '@/db/schema';
import { and, eq } from 'drizzle-orm';
import { cookies } from 'next/headers';
import { isConfiguredSuperAdmin } from '@/lib/super-admin';

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
  const cookieStore = await cookies();
  const selectedId = cookieStore.get('reliant_workspace')?.value;
  let isImpersonating = false;
  if (globalAdmin) {
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
  } else if (membership && selectedId) {
    const [selectedMembership] = await db
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
          eq(workspaceMembers.workspaceId, selectedId),
          eq(workspaceMembers.status, 'active'),
          eq(workspaces.status, 'active'),
        ),
      )
      .limit(1);
    if (selectedMembership) membership = selectedMembership;
  }

  if (!membership) {
    if (!configuredSuperAdmin) return null;
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
      role: 'super_admin',
    };

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

  return {
    db,
    auth,
    userId,
    isImpersonating,
    isPlatformAdmin: Boolean(globalAdmin) || configuredSuperAdmin,
    ...membership,
  };
}
