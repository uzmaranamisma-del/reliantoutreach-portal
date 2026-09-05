import { getChatGPTUser } from '@/app/chatgpt-auth';
import { getDb } from '@/db';
import { campaigns, integrations, mailboxes, syncJobs } from '@/db/schema';
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
    for (const item of remoteCampaigns) {
      if (!Number.isInteger(item.campaignId) || !item.name) continue;
      const id = await stableExternalId(
        workspaceId,
        `campaign:${item.campaignId}`,
      );
      const externalIdCiphertext = await encryptSecret(String(item.campaignId));
      const sent = Math.max(0, item.sentCount ?? 0);
      const bounced = Math.max(0, item.bounceCount ?? 0);
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
            lastSyncedAt: now,
            updatedAt: now,
          },
        });
    }
    for (const item of remoteSenders) {
      if (!Number.isInteger(item.senderId) || !item.email) continue;
      const email = item.email.trim().toLowerCase();
      const id = await stableExternalId(workspaceId, `sender:${item.senderId}`);
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
            lastSyncedAt: now,
            updatedAt: now,
          },
        });
    }
    const processed = remoteCampaigns.length + remoteSenders.length;
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
