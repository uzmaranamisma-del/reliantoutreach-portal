import { integrations } from '@/db/schema';
import { encryptSecret } from '@/lib/crypto';
import { getWorkspaceContext } from '@/lib/workspace-context';
import { and, eq } from 'drizzle-orm';

const json = (body: unknown, status = 200) =>
  Response.json(body, { status, headers: { 'Cache-Control': 'no-store' } });

export async function GET() {
  const ctx = await getWorkspaceContext();
  if (!ctx) return json({ error: 'Authentication required.' }, 401);
  const [record] = await ctx.db
    .select({
      status: integrations.status,
      lastFour: integrations.lastFour,
      updatedAt: integrations.updatedAt,
    })
    .from(integrations)
    .where(
      and(
        eq(integrations.workspaceId, ctx.workspaceId),
        eq(integrations.kind, 'invitation_email'),
      ),
    )
    .limit(1);
  return json({ connection: record ?? null });
}

export async function POST(request: Request) {
  const ctx = await getWorkspaceContext();
  if (!ctx) return json({ error: 'Authentication required.' }, 401);
  if (!['super_admin', 'account_manager', 'client_admin'].includes(ctx.role))
    return json(
      { error: 'You do not have permission to configure email.' },
      403,
    );

  const body = (await request.json().catch(() => null)) as {
    apiKey?: unknown;
    fromEmail?: unknown;
  } | null;
  const apiKey = typeof body?.apiKey === 'string' ? body.apiKey.trim() : '';
  const fromEmail =
    typeof body?.fromEmail === 'string'
      ? body.fromEmail.trim().toLowerCase()
      : '';
  if (!apiKey.startsWith('re_') || apiKey.length < 20 || apiKey.length > 256)
    return json({ error: 'Enter a valid Resend API key.' }, 400);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(fromEmail))
    return json({ error: 'Enter a valid verified sender email.' }, 400);

  const credentialsCiphertext = await encryptSecret(
    JSON.stringify({ apiKey, fromEmail }),
  );
  const now = new Date();
  await ctx.db
    .insert(integrations)
    .values({
      id: crypto.randomUUID(),
      workspaceId: ctx.workspaceId,
      kind: 'invitation_email',
      credentialsCiphertext,
      status: 'configured',
      lastFour: apiKey.slice(-4),
      createdAt: now,
      updatedAt: now,
    })
    .onConflictDoUpdate({
      target: [integrations.workspaceId, integrations.kind],
      set: {
        credentialsCiphertext,
        status: 'configured',
        lastFour: apiKey.slice(-4),
        updatedAt: now,
      },
    });
  return json({
    connection: {
      status: 'configured',
      lastFour: apiKey.slice(-4),
      updatedAt: now,
    },
  });
}
