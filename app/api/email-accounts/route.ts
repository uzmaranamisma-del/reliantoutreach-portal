import { getChatGPTUser } from '@/app/chatgpt-auth';
import { getDb } from '@/db';
import { mailboxes } from '@/db/schema';
import { desc, eq } from 'drizzle-orm';

const json = (body: unknown, status = 200) =>
  Response.json(body, { status, headers: { 'Cache-Control': 'no-store' } });
async function workspace() {
  const auth = await getChatGPTUser();
  return auth ? { db: getDb(), workspaceId: `workspace:${auth.userId}` } : null;
}
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const normalize = (value: unknown) =>
  typeof value === 'string' ? value.trim().toLowerCase() : '';

export async function GET() {
  const ctx = await workspace();
  if (!ctx) return json({ error: 'Authentication required' }, 401);
  const accounts = await ctx.db
    .select()
    .from(mailboxes)
    .where(eq(mailboxes.workspaceId, ctx.workspaceId))
    .orderBy(desc(mailboxes.createdAt))
    .limit(500);
  return json({ accounts });
}
export async function POST(request: Request) {
  const ctx = await workspace();
  if (!ctx) return json({ error: 'Authentication required' }, 401);
  let body: { email?: unknown; displayName?: unknown; dailyLimit?: unknown };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return json({ error: 'Invalid request' }, 400);
  }
  const email = normalize(body.email);
  if (!emailPattern.test(email))
    return json({ error: 'Enter a valid email address' }, 400);
  const dailyLimit = Math.min(500, Math.max(1, Number(body.dailyLimit) || 35));
  const now = new Date();
  const result = await ctx.db
    .insert(mailboxes)
    .values({
      id: crypto.randomUUID(),
      workspaceId: ctx.workspaceId,
      email,
      displayName:
        typeof body.displayName === 'string' ? body.displayName.trim() : null,
      domain: email.split('@')[1],
      status: 'registered',
      dailyLimit,
      sentToday: 0,
      health: 'pending',
      createdAt: now,
      updatedAt: now,
    })
    .onConflictDoNothing()
    .returning({ email: mailboxes.email });
  if (!result.length)
    return json({ error: 'This email account already exists' }, 409);
  return json(
    { account: { email, domain: email.split('@')[1], dailyLimit } },
    201,
  );
}
export async function PUT(request: Request) {
  const ctx = await workspace();
  if (!ctx) return json({ error: 'Authentication required' }, 401);
  let rows: Array<{
    email?: unknown;
    displayName?: unknown;
    dailyLimit?: unknown;
  }> = [];
  try {
    const body = (await request.json()) as { accounts?: typeof rows };
    rows = Array.isArray(body.accounts) ? body.accounts : [];
  } catch {
    return json({ error: 'Invalid request' }, 400);
  }
  if (!rows.length)
    return json({ error: 'No email accounts were provided' }, 400);
  if (rows.length > 1000)
    return json({ error: 'Import up to 1,000 accounts at a time' }, 400);
  const invalidCount = rows.filter(
    (row) => !emailPattern.test(normalize(row.email)),
  ).length;
  const unique = new Map<string, (typeof rows)[number]>();
  for (const row of rows)
    if (emailPattern.test(normalize(row.email)))
      unique.set(normalize(row.email), row);
  const valid = [...unique.entries()];
  if (!valid.length)
    return json(
      { error: 'The CSV does not contain valid email accounts' },
      400,
    );
  const now = new Date();
  const inserted = await ctx.db
    .insert(mailboxes)
    .values(
      valid.map(([email, row]) => ({
        id: crypto.randomUUID(),
        workspaceId: ctx.workspaceId,
        email,
        displayName:
          typeof row.displayName === 'string' ? row.displayName.trim() : null,
        domain: email.split('@')[1],
        status: 'registered',
        dailyLimit: Math.min(500, Math.max(1, Number(row.dailyLimit) || 35)),
        sentToday: 0,
        health: 'pending',
        createdAt: now,
        updatedAt: now,
      })),
    )
    .onConflictDoNothing()
    .returning({
      email: mailboxes.email,
      domain: mailboxes.domain,
      dailyLimit: mailboxes.dailyLimit,
    });
  return json({
    imported: inserted,
    importedCount: inserted.length,
    invalidCount,
    duplicateCount: rows.length - invalidCount - inserted.length,
  });
}
