import { domains, mailboxes, messages } from '@/db/schema';
import { getWorkspaceContext } from '@/lib/workspace-context';
import { and, desc, eq, gte } from 'drizzle-orm';
const json = (body: unknown, status = 200) =>
  Response.json(body, { status, headers: { 'Cache-Control': 'no-store' } });
async function workspace() {
  return getWorkspaceContext();
}
export async function GET() {
  const ctx = await workspace();
  if (!ctx) return json({ error: 'Authentication required' }, 401);
  const cutoff14 = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);
  const [rows, accountRows, sentRows] = await Promise.all([
    ctx.db
      .select()
      .from(domains)
      .where(eq(domains.workspaceId, ctx.workspaceId))
      .orderBy(desc(domains.createdAt))
      .limit(200),
    ctx.db
      .select({ domain: mailboxes.domain })
      .from(mailboxes)
      .where(eq(mailboxes.workspaceId, ctx.workspaceId))
      .limit(2000),
    ctx.db
      .select({
        fromEmail: messages.fromEmail,
        openCount: messages.openCount,
        occurredAt: messages.occurredAt,
      })
      .from(messages)
      .where(
        and(
          eq(messages.workspaceId, ctx.workspaceId),
          eq(messages.type, 'sent'),
          gte(messages.occurredAt, cutoff14),
        ),
      )
      .limit(10000),
  ]);
  const now = Date.now();
  const accountCounts = new Map<string, number>();
  for (const account of accountRows)
    accountCounts.set(
      account.domain,
      (accountCounts.get(account.domain) ?? 0) + 1,
    );
  const performance = new Map<
    string,
    {
      sent14d: number;
      opened14d: number;
      sent7d: number;
      opened7d: number;
      sent24h: number;
      opened24h: number;
    }
  >();
  for (const message of sentRows) {
    const domain = message.fromEmail.split('@')[1]?.toLowerCase();
    if (!domain) continue;
    const values = performance.get(domain) ?? {
      sent14d: 0,
      opened14d: 0,
      sent7d: 0,
      opened7d: 0,
      sent24h: 0,
      opened24h: 0,
    };
    const age = now - message.occurredAt.getTime();
    values.sent14d++;
    if (message.openCount > 0) values.opened14d++;
    if (age <= 7 * 24 * 60 * 60 * 1000) {
      values.sent7d++;
      if (message.openCount > 0) values.opened7d++;
    }
    if (age <= 24 * 60 * 60 * 1000) {
      values.sent24h++;
      if (message.openCount > 0) values.opened24h++;
    }
    performance.set(domain, values);
  }
  return json({
    domains: rows.map((row) => ({
      ...row,
      mailboxCount: accountCounts.get(row.domain) ?? 0,
      ...(performance.get(row.domain) ?? {
        sent14d: 0,
        opened14d: 0,
        sent7d: 0,
        opened7d: 0,
        sent24h: 0,
        opened24h: 0,
      }),
      bounceMetricsAvailable: false,
    })),
  });
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
