import { getChatGPTUser } from '@/app/chatgpt-auth';
import { getDb } from '@/db';
import { domains } from '@/db/schema';
import { desc, eq } from 'drizzle-orm';
const json = (body: unknown, status = 200) =>
  Response.json(body, { status, headers: { 'Cache-Control': 'no-store' } });
async function workspace() {
  const auth = await getChatGPTUser();
  return auth ? { db: getDb(), workspaceId: `workspace:${auth.userId}` } : null;
}
export async function GET() {
  const ctx = await workspace();
  if (!ctx) return json({ error: 'Authentication required' }, 401);
  const rows = await ctx.db
    .select()
    .from(domains)
    .where(eq(domains.workspaceId, ctx.workspaceId))
    .orderBy(desc(domains.createdAt))
    .limit(200);
  return json({ domains: rows });
}
export async function POST(request: Request) {
  const ctx = await workspace();
  if (!ctx) return json({ error: 'Authentication required' }, 401);
  let value = '';
  try {
    const body = (await request.json()) as { domain?: string };
    value = String(body.domain ?? '')
      .trim()
      .toLowerCase()
      .replace(/^https?:\/\//, '')
      .replace(/\/.*$/, '')
      .replace(/^www\./, '');
  } catch {
    return json({ error: 'Invalid request' }, 400);
  }
  if (
    !/^(?=.{4,253}$)(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/.test(
      value,
    )
  )
    return json({ error: 'Enter a valid domain such as example.com' }, 400);
  const now = new Date();
  const result = await ctx.db
    .insert(domains)
    .values({
      id: crypto.randomUUID(),
      workspaceId: ctx.workspaceId,
      domain: value,
      status: 'pending',
      spfStatus: 'pending',
      dkimStatus: 'pending',
      dmarcStatus: 'pending',
      mxStatus: 'pending',
      createdAt: now,
      updatedAt: now,
    })
    .onConflictDoNothing()
    .returning({ id: domains.id });
  if (!result.length) return json({ error: 'This domain already exists' }, 409);
  return json(
    {
      domain: {
        domain: value,
        status: 'Pending',
        spfStatus: 'Pending',
        dkimStatus: 'Selector needed',
        dmarcStatus: 'Pending',
        mxStatus: 'Pending',
      },
    },
    201,
  );
}

export async function PUT(request: Request) {
  const ctx = await workspace();
  if (!ctx) return json({ error: 'Authentication required' }, 401);
  let input: unknown[] = [];
  try {
    const body = (await request.json()) as { domains?: unknown[] };
    input = Array.isArray(body.domains) ? body.domains : [];
  } catch {
    return json({ error: 'Invalid request' }, 400);
  }
  if (!input.length) return json({ error: 'No domains were provided' }, 400);
  if (input.length > 1000)
    return json({ error: 'Import up to 1,000 domains at a time' }, 400);

  const normalize = (raw: unknown) =>
    (typeof raw === 'string' ? raw : '')
      .trim()
      .toLowerCase()
      .replace(/^https?:\/\//, '')
      .replace(/\/.*$/, '')
      .replace(/^www\./, '');
  const pattern =
    /^(?=.{4,253}$)(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/;
  const normalized = input.map(normalize);
  const valid = [...new Set(normalized.filter((value) => pattern.test(value)))];
  const invalid = normalized.filter((value) => !pattern.test(value)).length;
  const duplicateRows = normalized.length - new Set(normalized).size;
  if (!valid.length)
    return json({ error: 'The CSV does not contain any valid domains' }, 400);

  const now = new Date();
  const inserted = await ctx.db
    .insert(domains)
    .values(
      valid.map((domain) => ({
        id: crypto.randomUUID(),
        workspaceId: ctx.workspaceId,
        domain,
        status: 'pending',
        spfStatus: 'pending',
        dkimStatus: 'pending',
        dmarcStatus: 'pending',
        mxStatus: 'pending',
        createdAt: now,
        updatedAt: now,
      })),
    )
    .onConflictDoNothing()
    .returning({ domain: domains.domain });
  return json({
    imported: inserted.map((row) => row.domain),
    importedCount: inserted.length,
    duplicateCount: duplicateRows + valid.length - inserted.length,
    invalidCount: invalid,
  });
}
