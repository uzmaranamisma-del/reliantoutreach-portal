import { getChatGPTUser } from '@/app/chatgpt-auth';
import { getDb } from '@/db';
import { users, workspaceMembers, workspaces } from '@/db/schema';
import { and, eq } from 'drizzle-orm';

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
      role: 'client_admin',
    };
  }

  return { db, auth, userId, ...membership };
}
