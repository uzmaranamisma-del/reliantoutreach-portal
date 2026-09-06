import { integrations } from '@/db/schema';
import { encryptSecret } from '@/lib/crypto';
import { getWorkspaceContext } from '@/lib/workspace-context';
import { and, eq } from 'drizzle-orm';

const json = (body: unknown, status = 200) =>
  Response.json(body, { status, headers: { 'Cache-Control': 'no-store' } });
async function context() {
  return getWorkspaceContext();
}
export async function GET() {
  const ctx = await context();
  if (!ctx) return json({ error: 'Authentication required' }, 401);
  const [record] = await ctx.db
    .select({
      status: integrations.status,
      lastFour: integrations.lastFour,
      updatedAt: integrations.updatedAt,
      lastSyncedAt: integrations.lastSyncedAt,
    })
    .from(integrations)
    .where(
      and(
        eq(integrations.workspaceId, ctx.workspaceId),
        eq(integrations.kind, 'outreach'),
      ),
    )
    .limit(1);
  return json({ connection: record ?? null });
}
export async function POST(request: Request) {
  const ctx = await context();
  if (!ctx) return json({ error: 'Authentication required' }, 401);
  let apiKey = '';
  try {
    const body = (await request.json()) as { apiKey?: unknown };
    apiKey = typeof body.apiKey === 'string' ? body.apiKey.trim() : '';
  } catch {
    return json({ error: 'Invalid request' }, 400);
  }
  if (apiKey.length < 20 || apiKey.length > 256)
    return json({ error: 'Enter a valid API key' }, 400);
  const credentialsCiphertext = await encryptSecret(apiKey);
  const now = new Date();
  await ctx.db
    .insert(integrations)
    .values({
      id: crypto.randomUUID(),
      workspaceId: ctx.workspaceId,
      kind: 'outreach',
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
