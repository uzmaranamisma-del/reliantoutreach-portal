import { workspaces } from '@/db/schema';
import { getWorkspaceContext } from '@/lib/workspace-context';
import { eq } from 'drizzle-orm';
import { cookies } from 'next/headers';

export async function POST(request: Request) {
  const context = await getWorkspaceContext();
  if (!context) return Response.json({ error: 'Authentication required' }, { status: 401 });
  if (context.role !== 'super_admin') return Response.json({ error: 'Super Admin access required' }, { status: 403 });
  const origin = request.headers.get('origin');
  if (origin && origin !== new URL(request.url).origin) return Response.json({ error: 'Request could not be verified' }, { status: 403 });
  let id = '';
  try { id = String((await request.json() as { id?: string }).id ?? ''); } catch { return Response.json({ error: 'Invalid request' }, { status: 400 }); }
  const [workspace] = await context.db.select({ id: workspaces.id }).from(workspaces).where(eq(workspaces.id, id)).limit(1);
  if (!workspace) return Response.json({ error: 'Workspace not found' }, { status: 404 });
  (await cookies()).set('reliant_workspace', id, { httpOnly: true, sameSite: 'lax', secure: new URL(request.url).protocol === 'https:', path: '/', maxAge: 60 * 60 * 24 * 365 });
  return Response.json({ selected: true });
}
