import {
  campaigns,
  campaignSteps,
  messages,
  prospects,
  replies,
} from '@/db/schema';
import { getWorkspaceContext } from '@/lib/workspace-context';
import { and, asc, desc, eq, inArray, or } from 'drizzle-orm';

const clean = (value: string | null) =>
  (value ?? '')
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

export async function GET(
  request: Request,
  { params }: { params: Promise<{ campaignId: string }> },
) {
  const context = await getWorkspaceContext();
  if (!context)
    return Response.json({ error: 'Authentication required' }, { status: 401 });
  const { campaignId } = await params;
  const { db, workspaceId } = context;
  const [campaign] = await db
    .select()
    .from(campaigns)
    .where(
      and(eq(campaigns.id, campaignId), eq(campaigns.workspaceId, workspaceId)),
    )
    .limit(1);
  if (!campaign)
    return Response.json({ error: 'Campaign not found' }, { status: 404 });

  const [steps, campaignMessages, campaignReplies] = await Promise.all([
    db
      .select()
      .from(campaignSteps)
      .where(
        and(
          eq(campaignSteps.workspaceId, workspaceId),
          eq(campaignSteps.campaignId, campaignId),
        ),
      )
      .orderBy(asc(campaignSteps.stepNumber))
      .limit(100),
    db
      .select()
      .from(messages)
      .where(
        and(
          eq(messages.workspaceId, workspaceId),
          eq(messages.campaignId, campaignId),
        ),
      )
      .orderBy(desc(messages.occurredAt))
      .limit(5000),
    db
      .select({
        id: replies.id,
        prospectId: replies.prospectId,
        subject: replies.subject,
        body: replies.body,
        classification: replies.classification,
        providerClassification: replies.providerClassification,
        receivedAt: replies.receivedAt,
      })
      .from(replies)
      .where(
        and(
          eq(replies.workspaceId, workspaceId),
          eq(replies.campaignId, campaignId),
        ),
      )
      .orderBy(desc(replies.receivedAt))
      .limit(500),
  ]);

  const prospectIds = [
    ...new Set(
      [
        ...campaignMessages.map((row) => row.prospectId),
        ...campaignReplies.map((row) => row.prospectId),
      ].filter((value): value is string => Boolean(value)),
    ),
  ];
  const prospectEmails = [
    ...new Set(
      campaignMessages
        .flatMap((row) =>
          row.type === 'reply' ? [row.fromEmail] : [row.toEmail],
        )
        .map((email) => email.toLowerCase()),
    ),
  ];
  const campaignProspects =
    prospectIds.length || prospectEmails.length
      ? await db
          .select()
          .from(prospects)
          .where(
            and(
              eq(prospects.workspaceId, workspaceId),
              or(
                ...(prospectIds.length
                  ? [inArray(prospects.id, prospectIds)]
                  : []),
                ...(prospectEmails.length
                  ? [inArray(prospects.normalizedEmail, prospectEmails)]
                  : []),
              )!,
            ),
          )
          .limit(5000)
      : [];
  const prospectById = new Map(campaignProspects.map((row) => [row.id, row]));

  return Response.json(
    {
      campaign: {
        id: campaign.id,
        name: campaign.name,
        description: campaign.description,
        status: campaign.status,
        createdAt:
          campaign.startDate?.toISOString() ?? campaign.createdAt.toISOString(),
        lastUpdatedAt: campaign.lastSyncedAt?.toISOString() ?? null,
        counts: {
          prospects: campaign.prospectCount,
          sent: campaign.sentCount,
          delivered: campaign.deliveredCount,
          replies: campaign.replyCount,
          interested: campaign.positiveReplyCount,
        },
        settings: campaign.settings ?? {},
      },
      steps: steps.map((step) => ({
        id: step.id,
        stepNumber: step.stepNumber,
        sequenceName: step.sequenceName,
        sequenceCondition: step.sequenceCondition,
        waitAmount: step.waitAmount,
        waitUnit: step.waitUnit,
        subject: step.subject,
        body: clean(step.body),
        settings: step.settings,
      })),
      prospects: campaignProspects.slice(0, 500).map((prospect) => {
        const sent = campaignMessages.filter(
          (message) =>
            message.prospectId === prospect.id ||
            message.toEmail.toLowerCase() === prospect.normalizedEmail,
        );
        const responseCount = campaignReplies.filter(
          (reply) => reply.prospectId === prospect.id,
        ).length;
        return {
          id: prospect.id,
          email: prospect.email,
          firstName: prospect.firstName,
          lastName: prospect.lastName,
          company:
            prospect.customFields &&
            typeof prospect.customFields === 'object' &&
            'company' in prospect.customFields
              ? prospect.customFields.company
              : null,
          status: prospect.status,
          addedAt: prospect.createdAt.toISOString(),
          sent: sent.length,
          opens: sent.reduce((sum, message) => sum + message.openCount, 0),
          responses: responseCount,
        };
      }),
      replies: campaignReplies.map((reply) => ({
        ...reply,
        body: clean(reply.body),
        receivedAt: reply.receivedAt.toISOString(),
        prospect: prospectById.get(reply.prospectId)
          ? {
              email: prospectById.get(reply.prospectId)!.email,
              name: [
                prospectById.get(reply.prospectId)!.firstName,
                prospectById.get(reply.prospectId)!.lastName,
              ]
                .filter(Boolean)
                .join(' '),
            }
          : null,
      })),
    },
    { headers: { 'Cache-Control': 'no-store' } },
  );
}
