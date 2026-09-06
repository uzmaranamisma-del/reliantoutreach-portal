import { campaigns, campaignSteps, mailboxes } from '@/db/schema';
import { getWorkspaceContext } from '@/lib/workspace-context';
import { and, asc, eq } from 'drizzle-orm';

export async function GET(request: Request) {
  const context = await getWorkspaceContext();
  if (!context)
    return Response.json({ error: 'Authentication required' }, { status: 401 });
  const { workspaceId, db } = context;
  const requestedCampaignId = new URL(request.url).searchParams.get('campaign');
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
  const selectedSteps = selectedCampaign
    ? await db
        .select({
          id: campaignSteps.id,
          stepNumber: campaignSteps.stepNumber,
          sequenceName: campaignSteps.sequenceName,
          sequenceCondition: campaignSteps.sequenceCondition,
          waitAmount: campaignSteps.waitAmount,
          waitUnit: campaignSteps.waitUnit,
          subject: campaignSteps.subject,
          body: campaignSteps.body,
          settings: campaignSteps.settings,
        })
        .from(campaignSteps)
        .where(
          and(
            eq(campaignSteps.workspaceId, workspaceId),
            eq(campaignSteps.campaignId, selectedCampaign.id),
          ),
        )
        .orderBy(asc(campaignSteps.stepNumber))
        .limit(50)
    : [];
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
        ? {
            id: selectedCampaign.id,
            name: selectedCampaign.name,
            status: selectedCampaign.status,
            settings: selectedCampaign.settings,
            sequence: selectedSteps,
          }
        : null,
      lastUpdatedAt: latest ? new Date(latest).toISOString() : null,
    },
    { headers: { 'Cache-Control': 'no-store' } },
  );
}
