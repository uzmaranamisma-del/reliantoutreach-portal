import { getChatGPTUser } from '@/app/chatgpt-auth';
import { getDb } from '@/db';
import { prospects, users, workspaceMembers, workspaces } from '@/db/schema';
import { and, desc, eq, isNull } from 'drizzle-orm';

type ImportRow = {
  email: string;
  firstName?: string;
  lastName?: string;
  jobTitle?: string;
};
const json = (body: unknown, status = 200) =>
  Response.json(body, { status, headers: { 'Cache-Control': 'no-store' } });
async function context() {
  const auth = await getChatGPTUser();
  if (!auth) return null;
  const db = getDb(),
    now = new Date(),
    userId = `user:${auth.userId}`,
    workspaceId = `workspace:${auth.userId}`;
  await db
    .insert(users)
    .values({
      id: userId,
      authSubject: auth.userId,
      email: auth.email,
      name: auth.fullName,
      createdAt: now,
      updatedAt: now,
    })
    .onConflictDoNothing();
  await db
    .insert(workspaces)
    .values({
      id: workspaceId,
      name: 'Acme Automation',
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
  return { db, workspaceId };
}
export async function GET(request: Request) {
  const ctx = await context();
  if (!ctx) return json({ error: 'Authentication required' }, 401);
  const requestedPage = Number(new URL(request.url).searchParams.get('page'));
  const page =
    Number.isInteger(requestedPage) && requestedPage > 0 ? requestedPage : 1;
  const pageSize = 100;
  const rows = await ctx.db
    .select({
      id: prospects.id,
      email: prospects.email,
      firstName: prospects.firstName,
      lastName: prospects.lastName,
      jobTitle: prospects.jobTitle,
      status: prospects.status,
      customFields: prospects.customFields,
      createdAt: prospects.createdAt,
    })
    .from(prospects)
    .where(
      and(
        eq(prospects.workspaceId, ctx.workspaceId),
        isNull(prospects.archivedAt),
      ),
    )
    .orderBy(desc(prospects.createdAt))
    .limit(pageSize + 1)
    .offset((page - 1) * pageSize);
  const hasNext = rows.length > pageSize;
  return json({
    page,
    pageSize,
    hasNext,
    prospects: rows.slice(0, pageSize).map((row) => ({
      ...row,
      company:
        row.customFields &&
        typeof row.customFields === 'object' &&
        'company' in row.customFields &&
        typeof row.customFields.company === 'string'
          ? row.customFields.company
          : null,
      customFields: undefined,
    })),
  });
}
export async function POST(request: Request) {
  const ctx = await context();
  if (!ctx) return json({ error: 'Authentication required' }, 401);
  let body: { rows?: ImportRow[] };
  try {
    body = await request.json();
  } catch {
    return json({ error: 'Invalid request' }, 400);
  }
  if (
    !Array.isArray(body.rows) ||
    body.rows.length < 1 ||
    body.rows.length > 10000
  )
    return json({ error: 'Import must contain 1–10,000 rows' }, 400);
  const now = new Date();
  let imported = 0,
    duplicates = 0;
  for (const row of body.rows) {
    const email = String(row.email ?? '')
      .trim()
      .toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) continue;
    const saved = await ctx.db
      .insert(prospects)
      .values({
        id: crypto.randomUUID(),
        workspaceId: ctx.workspaceId,
        email,
        normalizedEmail: email,
        firstName: String(row.firstName ?? '').slice(0, 120),
        lastName: String(row.lastName ?? '').slice(0, 120),
        jobTitle: String(row.jobTitle ?? '').slice(0, 200),
        source: 'csv_import',
        status: 'imported',
        createdAt: now,
        updatedAt: now,
      })
      .onConflictDoNothing()
      .returning({ id: prospects.id });
    if (saved.length) imported++;
    else duplicates++;
  }
  return json({ imported, duplicates });
}
