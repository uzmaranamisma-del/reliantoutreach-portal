import { getChatGPTUser } from '@/app/chatgpt-auth';
import { getDb } from '@/db';
import { campaigns, mailboxes } from '@/db/schema';
import { eq } from 'drizzle-orm';

export async function GET(request: Request) {
  const auth = await getChatGPTUser();
  if (!auth)
    return Response.json({ error: 'Authentication required' }, { status: 401 });
  const workspaceId = `workspace:${auth.userId}`;
  const requestedCampaignId = new URL(request.url).searchParams.get('campaign');
  const db = getDb();
  const [campaignRows, mailboxRows] = await Promise.all([
    db
      .select()
      .from(campaigns)
      .where(eq(campaigns.workspaceId, workspaceId))
      .limit(1000),
    db
      .select()
      .from(mailboxes)
      .where(eq(mailboxes.workspaceId, workspaceId))
      .limit(1000),
  ]);
  const selectedCampaign = requestedCampaignId
    ? (campaignRows.find((row) => row.id === requestedCampaignId) ?? null)
    : null;
  const metricRows = selectedCampaign ? [selectedCampaign] : campaignRows;
  const total = (
    field:
      | 'prospectCount'
      | 'sentCount'
      | 'deliveredCount'
      | 'replyCount'
      | 'positiveReplyCount',
  ) => metricRows.reduce((sum, row) => sum + row[field], 0);
  const latest = campaignRows
    .map((row) => row.lastSyncedAt?.getTime() ?? 0)
    .reduce((a, b) => Math.max(a, b), 0);
  return Response.json(
    {
      metrics: {
        activeCampaigns: metricRows.filter((row) => row.status === 'active')
          .length,
        prospects: total('prospectCount'),
        sent: total('sentCount'),
        delivered: total('deliveredCount'),
        replies: total('replyCount'),
        positiveReplies: total('positiveReplyCount'),
        activeMailboxes: mailboxRows.filter((row) => row.status === 'connected')
          .length,
      },
      campaigns: campaignRows
        .sort((a, b) => b.sentCount - a.sentCount)
        .slice(0, 5)
        .map((row) => ({
          id: row.id,
          name: row.name,
          status: row.status,
          contacted: row.prospectCount,
          sent: row.sentCount,
          replies: row.replyCount,
          positiveReplies: row.positiveReplyCount,
          replyRate: row.deliveredCount
            ? (row.replyCount / row.deliveredCount) * 100
            : 0,
        })),
      selectedCampaign: selectedCampaign
        ? { id: selectedCampaign.id, name: selectedCampaign.name }
        : null,
      lastUpdatedAt: latest ? new Date(latest).toISOString() : null,
    },
    { headers: { 'Cache-Control': 'no-store' } },
  );
}
