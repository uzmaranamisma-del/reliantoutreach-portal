import { getWorkspaceContext } from '@/lib/workspace-context';

export async function GET() {
  const context = await getWorkspaceContext();
  if (!context)
    return Response.json({ error: 'Authentication required' }, { status: 401 });
  return Response.json(
    {
      user: {
        name: context.auth.fullName || context.auth.email,
        email: context.auth.email,
      },
      workspace: {
        id: context.workspaceId,
        name: context.workspaceName,
        role: context.role,
        isImpersonating: context.isImpersonating,
      },
    },
    { headers: { 'Cache-Control': 'no-store' } },
  );
}
