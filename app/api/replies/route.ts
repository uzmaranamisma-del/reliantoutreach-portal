import { getChatGPTUser } from '@/app/chatgpt-auth';
import { getDb } from '@/db';
import { campaigns, prospects, replies } from '@/db/schema';
import { and, desc, eq } from 'drizzle-orm';

const allowedClassifications = new Set([
  'interested',
  'positive',
  'needs_information',
  'follow_up_later',
  'referral',
  'not_interested',
  'wrong_person',
  'out_of_office',
  'unsubscribe',
  'meeting_booked',
  'other',
]);
const json = (body: unknown, status = 200) =>
  Response.json(body, { status, headers: { 'Cache-Control': 'no-store' } });

export async function GET() {
  const auth = await getChatGPTUser();
  if (!auth) return json({ error: 'Authentication required' }, 401);
  const workspaceId = `workspace:${auth.userId}`;
  const rows = await getDb()
    .select({
      id: replies.id,
      subject: replies.subject,
      body: replies.body,
      classification: replies.classification,
      providerClassification: replies.providerClassification,
      receivedAt: replies.receivedAt,
      prospectEmail: prospects.email,
      firstName: prospects.firstName,
      lastName: prospects.lastName,
      campaignName: campaigns.name,
    })
    .from(replies)
    .innerJoin(prospects, eq(replies.prospectId, prospects.id))
    .leftJoin(campaigns, eq(replies.campaignId, campaigns.id))
    .where(eq(replies.workspaceId, workspaceId))
    .orderBy(desc(replies.receivedAt))
    .limit(500);
  return json({
    replies: rows.map((row) => ({
      ...row,
      body: row.body
        .replace(/<[^>]*>/g, ' ')
        .replace(/\s+/g, ' ')
        .trim(),
    })),
  });
}

export async function PATCH(request: Request) {
  const auth = await getChatGPTUser();
  if (!auth) return json({ error: 'Authentication required' }, 401);
  let body: { id?: string; classification?: string };
  try {
    body = await request.json();
  } catch {
    return json({ error: 'Invalid request' }, 400);
  }
  if (
    !body.id ||
    !body.classification ||
    !allowedClassifications.has(body.classification)
  )
    return json({ error: 'Choose a valid classification' }, 400);
  const workspaceId = `workspace:${auth.userId}`;
  const updated = await getDb()
    .update(replies)
    .set({ classification: body.classification, updatedAt: new Date() })
    .where(and(eq(replies.id, body.id), eq(replies.workspaceId, workspaceId)))
    .returning({ id: replies.id });
  if (!updated.length) return json({ error: 'Reply not found' }, 404);
  return json({ updated: true });
}
