import { workspaceMembers, workspaces } from '@/db/schema';
import { getWorkspaceContext } from '@/lib/workspace-context';
import { and, eq } from 'drizzle-orm';
import { cookies } from 'next/headers';

async function isGlobalAdmin(
  context: NonNullable<Awaited<ReturnType<typeof getWorkspaceContext>>>,
) {
  const [membership] = await context.db
    .select({ id: workspaceMembers.id })
    .from(workspaceMembers)
    .where(
      and(
        eq(workspaceMembers.userId, context.userId),
        eq(workspaceMembers.role, 'super_admin'),
        eq(workspaceMembers.status, 'active'),
      ),
    )
    .limit(1);
  return Boolean(membership);
}

export async function POST(request: Request) {
  const context = await getWorkspaceContext();
  if (!context)
    return Response.json({ error: 'Authentication required' }, { status: 401 });
  if (!(await isGlobalAdmin(context)))
    return Response.json(
      { error: 'Super Admin access required' },
      { status: 403 },
    );
  const origin = request.headers.get('origin');
  if (origin && origin !== new URL(request.url).origin)
    return Response.json(
      { error: 'Request could not be verified' },
      { status: 403 },
    );
  let id = '';
  try {
    id = String(((await request.json()) as { id?: string }).id ?? '');
  } catch {
    return Response.json({ error: 'Invalid request' }, { status: 400 });
  }
  const [workspace] = await context.db
    .select({ id: workspaces.id })
    .from(workspaces)
    .where(eq(workspaces.id, id))
    .limit(1);
  if (!workspace)
    return Response.json({ error: 'Workspace not found' }, { status: 404 });
  const cookieStore = await cookies();
  const cookieOptions = {
    httpOnly: true,
    sameSite: 'lax' as const,
    secure: new URL(request.url).protocol === 'https:',
    path: '/',
    maxAge: 60 * 60 * 8,
  };
  cookieStore.set('reliant_workspace', id, cookieOptions);
  cookieStore.set('reliant_client_preview', id, cookieOptions);
  return Response.json({ selected: true });
}

export async function DELETE(request: Request) {
  const context = await getWorkspaceContext();
  if (!context)
    return Response.json({ error: 'Authentication required' }, { status: 401 });
  if (!(await isGlobalAdmin(context)))
    return Response.json(
      { error: 'Super Admin access required' },
      { status: 403 },
    );
  const origin = request.headers.get('origin');
  if (origin && origin !== new URL(request.url).origin)
    return Response.json(
      { error: 'Request could not be verified' },
      { status: 403 },
    );
  const cookieStore = await cookies();
  cookieStore.delete('reliant_workspace');
  cookieStore.delete('reliant_client_preview');
  return Response.json({ exited: true });
}
