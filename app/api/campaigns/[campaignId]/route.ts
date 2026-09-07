import {
  campaigns,
  campaignSteps,
  integrations,
  messages,
  prospects,
  replies,
} from '@/db/schema';
/* oxlint-disable typescript/no-explicit-any */
import { getWorkspaceContext } from '@/lib/workspace-context';
import { decryptSecret } from '@/lib/crypto';
import { OutreachProvider } from '@/lib/outreach/provider';
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
        settings: step.settings && typeof step.settings === 'object'
          ? Object.fromEntries(Object.entries(step.settings).filter(([key]) => key !== 'sequenceExternalIdCiphertext'))
          : {},
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

const editableFields = new Set([
  'name',
  'description',
  'subject',
  'body',
  'dailyLimit',
  'dailyLimitPer',
  'scheduleSending',
  'scheduleTimeZone',
  'trackOpens',
  'trackClicks',
  'textOnlyEmails',
  'sendUnsubscribeListHeader',
  'stopCoworkersOnReply',
  'useProspectsTimeZone',
  'sendMon', 'sendMonAfter', 'sendMonBefore',
  'sendTue', 'sendTueAfter', 'sendTueBefore',
  'sendWed', 'sendWedAfter', 'sendWedBefore',
  'sendThu', 'sendThuAfter', 'sendThuBefore',
  'sendFri', 'sendFriAfter', 'sendFriBefore',
  'sendSat', 'sendSatAfter', 'sendSatBefore',
  'sendSun', 'sendSunAfter', 'sendSunBefore',
]);

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ campaignId: string }> },
) {
  const context = await getWorkspaceContext();
  if (!context)
    return Response.json({ error: 'Authentication required' }, { status: 401 });
  if (context.role === 'client_viewer')
    return Response.json(
      { error: 'You do not have permission to edit campaigns.' },
      { status: 403 },
    );
  const { campaignId } = await params;
  let submitted: Record<string, unknown>;
  try {
    submitted = (await request.json()) as Record<string, unknown>;
  } catch {
    return Response.json({ error: 'Invalid request' }, { status: 400 });
  }
  const fields = Object.fromEntries(
    Object.entries(submitted).filter(([key]) => editableFields.has(key)),
  );
  if (!Object.keys(fields).length)
    return Response.json(
      { error: 'No supported changes were supplied.' },
      { status: 400 },
    );
  if (
    typeof fields.name === 'string' &&
    (!fields.name.trim() || fields.name.length > 256)
  )
    return Response.json(
      { error: 'Campaign name must be between 1 and 256 characters.' },
      { status: 400 },
    );
  if (
    typeof fields.dailyLimit === 'number' &&
    (fields.dailyLimit < 1 || fields.dailyLimit > 10000)
  )
    return Response.json(
      { error: 'Daily limit must be between 1 and 10,000.' },
      { status: 400 },
    );

  const [campaign] = await context.db
    .select()
    .from(campaigns)
    .where(
      and(
        eq(campaigns.id, campaignId),
        eq(campaigns.workspaceId, context.workspaceId),
      ),
    )
    .limit(1);
  if (!campaign?.externalIdCiphertext)
    return Response.json(
      { error: 'This campaign is not connected for editing.' },
      { status: 409 },
    );
  const [integration] = await context.db
    .select()
    .from(integrations)
    .where(
      and(
        eq(integrations.workspaceId, context.workspaceId),
        eq(integrations.kind, 'outreach'),
      ),
    )
    .limit(1);
  if (!integration)
    return Response.json(
      { error: 'Outreach connection is not configured.' },
      { status: 409 },
    );
  try {
    const externalId = Number(
      await decryptSecret(campaign.externalIdCiphertext),
    );
    const provider = new OutreachProvider(
      await decryptSecret(integration.credentialsCiphertext),
    );
    const updated = await provider.updateCampaign(externalId, fields);
    const current = (campaign.settings ?? {}) as Record<string, any>;
    const next = {
      ...current,
      initialEmail: {
        ...current.initialEmail,
        subject:
          updated.subject ?? fields.subject ?? current.initialEmail?.subject,
        body: updated.body ?? fields.body ?? current.initialEmail?.body,
      },
      dailyLimit: updated.dailyLimit ?? fields.dailyLimit ?? current.dailyLimit,
      dailyLimitPer:
        updated.dailyLimitPer ?? fields.dailyLimitPer ?? current.dailyLimitPer,
      scheduleSending:
        updated.scheduleSending ??
        fields.scheduleSending ??
        current.scheduleSending,
      scheduleTimeZone:
        updated.scheduleTimeZone ??
        fields.scheduleTimeZone ??
        current.scheduleTimeZone,
      tracking: {
        ...current.tracking,
        opens:
          updated.trackOpens ?? fields.trackOpens ?? current.tracking?.opens,
        clicks:
          updated.trackClicks ?? fields.trackClicks ?? current.tracking?.clicks,
        textOnly:
          updated.textOnlyEmails ??
          fields.textOnlyEmails ??
          current.tracking?.textOnly,
      },
      advanced: {
        ...current.advanced,
        unsubscribeHeader:
          updated.sendUnsubscribeListHeader ??
          fields.sendUnsubscribeListHeader ??
          current.advanced?.unsubscribeHeader,
        stopCoworkersOnReply:
          updated.stopCoworkersOnReply ??
          fields.stopCoworkersOnReply ??
          current.advanced?.stopCoworkersOnReply,
        useProspectTimezone:
          updated.useProspectsTimeZone ??
          fields.useProspectsTimeZone ??
          current.advanced?.useProspectTimezone,
      },
      days: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day, index) => {
        const previous = Array.isArray(current.days) ? current.days[index] : null;
        return [previous?.[0] ?? day, updated[`send${day}` as keyof typeof updated] ?? fields[`send${day}`] ?? previous?.[1] ?? false, updated[`send${day}After` as keyof typeof updated] ?? fields[`send${day}After`] ?? previous?.[2] ?? 540, updated[`send${day}Before` as keyof typeof updated] ?? fields[`send${day}Before`] ?? previous?.[3] ?? 1020];
      }),
    };
    await context.db
      .update(campaigns)
      .set({
        name:
          updated.name ?? (fields.name as string | undefined) ?? campaign.name,
        description:
          updated.description ??
          (fields.description as string | undefined) ??
          campaign.description,
        settings: next,
        updatedAt: new Date(),
        lastSyncedAt: new Date(),
      })
      .where(
        and(
          eq(campaigns.id, campaignId),
          eq(campaigns.workspaceId, context.workspaceId),
        ),
      );
    return Response.json({ saved: true });
  } catch {
    return Response.json(
      { error: 'Campaign changes could not be saved. Please try again.' },
      { status: 502 },
    );
  }
}
