import { getChatGPTUser } from '@/app/chatgpt-auth';
import { getDb } from '@/db';
import {
  campaigns,
  domains,
  integrations,
  mailboxes,
  messages,
  prospects,
  replies,
  syncJobs,
} from '@/db/schema';
import { decryptSecret, encryptSecret, stableExternalId } from '@/lib/crypto';
import { OutreachProvider } from '@/lib/outreach/provider';
import { and, desc, eq } from 'drizzle-orm';

const json = (body: unknown, status = 200) =>
  Response.json(body, { status, headers: { 'Cache-Control': 'no-store' } });
const statusMap: Record<string, string> = {
  Running: 'active',
  Draft: 'draft',
  Paused: 'paused',
  Completed: 'completed',
  Archived: 'archived',
  Scheduled: 'scheduled',
  Preparing: 'scheduled',
  Warning: 'paused',
  Blocked: 'paused',
};
const prospectStatusMap: Record<string, string> = {
  Interested: 'interested',
  MeetingBooked: 'meeting_booked',
  MeetingCompleted: 'meeting_booked',
  Won: 'won',
  NotInterested: 'not_interested',
  MaybeLater: 'follow_up',
  Unsub: 'unsubscribed',
  BounceHard: 'bounced',
  BounceSoft: 'bounced',
  AutoOoo: 'follow_up',
  AutoReply: 'replied',
};

export async function POST() {
  const auth = await getChatGPTUser();
  if (!auth) return json({ error: 'Authentication required' }, 401);
  const db = getDb();
  const workspaceId = `workspace:${auth.userId}`;
  const now = new Date();
  const jobId = crypto.randomUUID();
  const [latestJob] = await db
    .select({ startedAt: syncJobs.startedAt })
    .from(syncJobs)
    .where(
      and(
        eq(syncJobs.workspaceId, workspaceId),
        eq(syncJobs.kind, 'outreach_refresh'),
      ),
    )
    .orderBy(desc(syncJobs.createdAt))
    .limit(1);
  if (
    latestJob?.startedAt &&
    now.getTime() - latestJob.startedAt.getTime() < 60_000
  ) {
    return json(
      { error: 'A recent sync is already running. Please wait one minute.' },
      429,
    );
  }
  const [integration] = await db
    .select()
    .from(integrations)
    .where(
      and(
        eq(integrations.workspaceId, workspaceId),
        eq(integrations.kind, 'outreach'),
      ),
    )
    .limit(1);
  if (!integration)
    return json({ error: 'Connect your outreach account first' }, 409);
  await db.insert(syncJobs).values({
    id: jobId,
    workspaceId,
    kind: 'outreach_refresh',
    status: 'running',
    recordsProcessed: 0,
    attemptCount: 1,
    startedAt: now,
    createdAt: now,
    updatedAt: now,
  });
  try {
    const provider = new OutreachProvider(
      await decryptSecret(integration.credentialsCiphertext),
    );
    const [remoteCampaigns, remoteSenders] = await Promise.all([
      provider.getCampaigns(),
      provider.getSenders(),
    ]);
    const optionalResults = await Promise.allSettled([
      provider.getProspects(),
      provider.getMessages(),
    ]);
    const remoteProspects =
      optionalResults[0].status === 'fulfilled' ? optionalResults[0].value : [];
    const remoteMessages =
      optionalResults[1].status === 'fulfilled' ? optionalResults[1].value : [];
    const warnings = [
      optionalResults[0].status === 'rejected' ? 'prospects_unavailable' : null,
      optionalResults[1].status === 'rejected' ? 'messages_unavailable' : null,
    ].filter(Boolean);
    const synchronizedCampaignIds = new Set(
      remoteCampaigns.map((campaign) => campaign.campaignId),
    );
    for (const item of remoteCampaigns) {
      if (!Number.isInteger(item.campaignId) || !item.name) continue;
      const id = await stableExternalId(
        workspaceId,
        `campaign:${item.campaignId}`,
      );
      const externalIdCiphertext = await encryptSecret(String(item.campaignId));
      const sent = Math.max(0, item.sentCount ?? 0);
      const bounced = Math.max(0, item.bounceCount ?? 0);
      const campaignSettings = {
        dailyLimit: item.dailyLimit ?? null,
        dailyLimitPer: item.dailyLimitPer ?? null,
        scheduleSending: item.scheduleSending ?? null,
        scheduleTimeZone: item.scheduleTimeZone ?? null,
        delayMinMinutes: item.delayMinMinutes ?? null,
        delayMinSeconds: item.delayMinSeconds ?? null,
        days: [
          ['Monday', item.sendMon, item.sendMonAfter, item.sendMonBefore],
          ['Tuesday', item.sendTue, item.sendTueAfter, item.sendTueBefore],
          ['Wednesday', item.sendWed, item.sendWedAfter, item.sendWedBefore],
          ['Thursday', item.sendThu, item.sendThuAfter, item.sendThuBefore],
          ['Friday', item.sendFri, item.sendFriAfter, item.sendFriBefore],
          ['Saturday', item.sendSat, item.sendSatAfter, item.sendSatBefore],
          ['Sunday', item.sendSun, item.sendSunAfter, item.sendSunBefore],
        ],
      };
      await db
        .insert(campaigns)
        .values({
          id,
          workspaceId,
          name: item.name,
          description: item.description ?? null,
          status: statusMap[item.status] ?? 'draft',
          provider: 'outreach',
          externalIdCiphertext,
          startDate: item.createdAt ? new Date(item.createdAt) : null,
          prospectCount: Math.max(0, item.prospectCount ?? 0),
          sentCount: sent,
          deliveredCount: Math.max(0, sent - bounced),
          replyCount: Math.max(0, item.replyCount ?? 0),
          positiveReplyCount: Math.max(0, item.interestedCount ?? 0),
          settings: campaignSettings,
          lastSyncedAt: now,
          createdAt: item.createdAt ? new Date(item.createdAt) : now,
          updatedAt: now,
        })
        .onConflictDoUpdate({
          target: campaigns.id,
          set: {
            name: item.name,
            description: item.description ?? null,
            status: statusMap[item.status] ?? 'draft',
            externalIdCiphertext,
            prospectCount: Math.max(0, item.prospectCount ?? 0),
            sentCount: sent,
            deliveredCount: Math.max(0, sent - bounced),
            replyCount: Math.max(0, item.replyCount ?? 0),
            positiveReplyCount: Math.max(0, item.interestedCount ?? 0),
            settings: campaignSettings,
            lastSyncedAt: now,
            updatedAt: now,
          },
        });
    }
    for (const item of remoteSenders) {
      if (!Number.isInteger(item.senderId) || !item.email) continue;
      const email = item.email.trim().toLowerCase();
      const id = await stableExternalId(workspaceId, `sender:${item.senderId}`);
      const mailboxSettings = {
        delayMinMinutes: item.delayMinMinutes ?? null,
        dailyLimitIncrease: item.dailyLimitIncrease ?? null,
        dailyLimitIncreaseToMax: item.dailyLimitIncreaseToMax ?? null,
        warmupDailyLimit: item.warmupDailyLimit ?? null,
        warmupReplyPercent: item.warmupReplyPercent ?? null,
        warmupSkipWeekends: item.warmupSkipWeekends ?? null,
      };
      await db
        .insert(mailboxes)
        .values({
          id,
          workspaceId,
          email,
          displayName: item.fromName ?? null,
          domain: email.split('@')[1] ?? '',
          provider: 'outreach',
          externalIdCiphertext: await encryptSecret(String(item.senderId)),
          status: item.disconnected ? 'disconnected' : 'connected',
          dailyLimit: item.dailyLimit ?? null,
          sentToday: 0,
          health: item.disconnected
            ? 'error'
            : item.warmup
              ? 'warming'
              : 'healthy',
          settings: mailboxSettings,
          lastSyncedAt: now,
          createdAt: now,
          updatedAt: now,
        })
        .onConflictDoUpdate({
          target: [mailboxes.workspaceId, mailboxes.email],
          set: {
            displayName: item.fromName ?? null,
            provider: 'outreach',
            externalIdCiphertext: await encryptSecret(String(item.senderId)),
            status: item.disconnected ? 'disconnected' : 'connected',
            dailyLimit: item.dailyLimit ?? null,
            health: item.disconnected
              ? 'error'
              : item.warmup
                ? 'warming'
                : 'healthy',
            settings: mailboxSettings,
            lastSyncedAt: now,
            updatedAt: now,
          },
        });
      const domain = email.split('@')[1];
      if (domain) {
        await db
          .insert(domains)
          .values({
            id: await stableExternalId(workspaceId, `domain:${domain}`),
            workspaceId,
            domain,
            status: 'pending',
            spfStatus: 'pending',
            dkimStatus: 'selector_needed',
            dmarcStatus: 'pending',
            mxStatus: 'pending',
            createdAt: now,
            updatedAt: now,
          })
          .onConflictDoNothing();
      }
    }
    const prospectByEmail = new Map<string, { id: string; status: string }>();
    for (const item of remoteProspects) {
      if (!Number.isInteger(item.prospectId) || !item.email) continue;
      const email = item.email.trim().toLowerCase();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) continue;
      const id = await stableExternalId(
        workspaceId,
        `prospect:${item.prospectId}`,
      );
      const status = prospectStatusMap[item.sendingStatus ?? ''] ?? 'imported';
      const customFields = {
        company: item.company ?? null,
        website: item.website ?? null,
        domain: item.domain ?? null,
        industry: item.industry ?? null,
        companySize: item.companySize ?? null,
        location: item.location ?? null,
        validationStatus: item.validationStatus ?? null,
      };
      const [savedProspect] = await db
        .insert(prospects)
        .values({
          id,
          workspaceId,
          email,
          normalizedEmail: email,
          firstName: item.firstName ?? null,
          lastName: item.lastName ?? null,
          jobTitle: item.jobPosition ?? null,
          phone: item.phone ?? null,
          linkedinUrl: item.personalSocial ?? null,
          country: item.country ?? null,
          state: item.state ?? null,
          city: item.city ?? null,
          source: 'outreach_sync',
          provider: 'outreach',
          externalIdCiphertext: await encryptSecret(String(item.prospectId)),
          status,
          notes: item.notes ?? null,
          customFields,
          createdAt: item.createdAt ? new Date(item.createdAt) : now,
          updatedAt: now,
        })
        .onConflictDoUpdate({
          target: [prospects.workspaceId, prospects.normalizedEmail],
          set: {
            firstName: item.firstName ?? null,
            lastName: item.lastName ?? null,
            jobTitle: item.jobPosition ?? null,
            phone: item.phone ?? null,
            linkedinUrl: item.personalSocial ?? null,
            country: item.country ?? null,
            state: item.state ?? null,
            city: item.city ?? null,
            provider: 'outreach',
            externalIdCiphertext: await encryptSecret(String(item.prospectId)),
            status,
            notes: item.notes ?? null,
            customFields,
            updatedAt: now,
          },
        })
        .returning({ id: prospects.id });
      prospectByEmail.set(email, { id: savedProspect?.id ?? id, status });
    }
    for (const item of remoteMessages) {
      if (
        !item.messageId ||
        !item.createdAt ||
        !item.fromEmail ||
        !item.toEmail
      )
        continue;
      const externalKey = `${item.type}:${item.messageId}`;
      const messageId = await stableExternalId(
        workspaceId,
        `message:${externalKey}`,
      );
      const campaignId =
        item.campaignId && synchronizedCampaignIds.has(item.campaignId)
          ? await stableExternalId(workspaceId, `campaign:${item.campaignId}`)
          : null;
      const prospectEmail =
        item.type === 'Reply'
          ? item.fromEmail.trim().toLowerCase()
          : item.toEmail.trim().toLowerCase();
      const prospect = prospectByEmail.get(prospectEmail);
      const occurredAt = new Date(item.createdAt);
      const body = item.body ?? '';
      await db
        .insert(messages)
        .values({
          id: messageId,
          workspaceId,
          campaignId,
          prospectId: prospect?.id ?? null,
          provider: 'outreach',
          externalIdCiphertext: await encryptSecret(externalKey),
          type: item.type === 'Reply' ? 'reply' : 'sent',
          fromEmail: item.fromEmail.trim().toLowerCase(),
          toEmail: item.toEmail.trim().toLowerCase(),
          subject: item.subject ?? null,
          body,
          openCount: item.openCount ?? 0,
          occurredAt,
          createdAt: occurredAt,
          updatedAt: now,
        })
        .onConflictDoUpdate({
          target: messages.id,
          set: {
            campaignId,
            prospectId: prospect?.id ?? null,
            subject: item.subject ?? null,
            body,
            openCount: item.openCount ?? 0,
            updatedAt: now,
          },
        });
      if (item.type !== 'Reply' || !prospect) continue;
      const replyId = await stableExternalId(
        workspaceId,
        `reply:${externalKey}`,
      );
      await db
        .insert(replies)
        .values({
          id: replyId,
          workspaceId,
          campaignId,
          prospectId: prospect.id,
          provider: 'outreach',
          externalIdCiphertext: await encryptSecret(externalKey),
          subject: item.subject ?? null,
          body,
          providerClassification: prospect.status,
          classification: null,
          receivedAt: occurredAt,
          createdAt: occurredAt,
          updatedAt: now,
        })
        .onConflictDoUpdate({
          target: replies.id,
          set: {
            campaignId,
            subject: item.subject ?? null,
            body,
            providerClassification: prospect.status,
            updatedAt: now,
          },
        });
    }
    const processed =
      remoteCampaigns.length +
      remoteSenders.length +
      remoteProspects.length +
      remoteMessages.length;
    await db
      .update(integrations)
      .set({ status: 'connected', lastSyncedAt: now, updatedAt: now })
      .where(eq(integrations.id, integration.id));
    await db
      .update(syncJobs)
      .set({
        status: 'completed',
        recordsProcessed: processed,
        finishedAt: now,
        updatedAt: now,
      })
      .where(eq(syncJobs.id, jobId));
    return json({
      status: 'complete',
      campaigns: remoteCampaigns.length,
      emailAccounts: remoteSenders.length,
      prospects: remoteProspects.length,
      messages: remoteMessages.length,
      warnings,
      recordsProcessed: processed,
      syncedAt: now,
    });
  } catch (error) {
    const code =
      error instanceof Error &&
      ['AUTHENTICATION_FAILED', 'RATE_LIMITED'].includes(error.message)
        ? error.message
        : 'SYNC_FAILED';
    await db
      .update(integrations)
      .set({
        status:
          code === 'AUTHENTICATION_FAILED' ? 'action_required' : 'configured',
        updatedAt: now,
      })
      .where(eq(integrations.id, integration.id));
    await db
      .update(syncJobs)
      .set({
        status: 'failed',
        safeErrorCode: code,
        finishedAt: now,
        updatedAt: now,
      })
      .where(eq(syncJobs.id, jobId));
    const message =
      code === 'AUTHENTICATION_FAILED'
        ? 'The saved connection could not be verified. Add a fresh API key.'
        : code === 'RATE_LIMITED'
          ? 'Sync limit reached. Please wait and try again.'
          : 'Campaign data could not be synchronized. Please try again.';
    return json(
      { error: message },
      code === 'AUTHENTICATION_FAILED' ? 401 : 503,
    );
  }
}
