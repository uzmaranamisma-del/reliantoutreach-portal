import { campaignSteps, campaigns, integrations } from '@/db/schema';
import { decryptSecret } from '@/lib/crypto';
import { OutreachProvider } from '@/lib/outreach/provider';
import { getWorkspaceContext } from '@/lib/workspace-context';
import { and, asc, eq } from 'drizzle-orm';

type FollowupInput = {
  action?: 'create' | 'update' | 'delete';
  stepId?: string;
  subject?: string;
  body?: string;
  waitMin?: number;
  waitUnits?: 'Minutes' | 'Hours' | 'Days';
  useOriginalSubject?: boolean;
  sendInSameThread?: boolean;
};
const reply = (body: unknown, status = 200) => Response.json(body, { status, headers: { 'Cache-Control': 'no-store' } });

export async function POST(request: Request, { params }: { params: Promise<{ campaignId: string }> }) {
  const context = await getWorkspaceContext();
  if (!context) return reply({ error: 'Authentication required' }, 401);
  if (context.role === 'client_viewer') return reply({ error: 'You do not have permission to edit campaign sequences.' }, 403);
  const { campaignId } = await params;
  let input: FollowupInput;
  try { input = await request.json() as FollowupInput; } catch { return reply({ error: 'Invalid request' }, 400); }
  if (!input.action || !['create', 'update', 'delete'].includes(input.action)) return reply({ error: 'Choose a valid action.' }, 400);
  if (input.action !== 'delete' && (!Number.isInteger(input.waitMin) || (input.waitMin ?? 0) < 1 || (input.waitMin ?? 0) > 1000 || !['Minutes', 'Hours', 'Days'].includes(input.waitUnits ?? ''))) return reply({ error: 'Choose a wait time between 1 and 1,000 and a valid unit.' }, 400);
  if (input.subject && input.subject.length > 1024) return reply({ error: 'Subject must be 1,024 characters or less.' }, 400);

  const [campaign] = await context.db.select({ id: campaigns.id }).from(campaigns).where(and(eq(campaigns.id, campaignId), eq(campaigns.workspaceId, context.workspaceId))).limit(1);
  if (!campaign) return reply({ error: 'Campaign not found' }, 404);
  const [integration] = await context.db.select().from(integrations).where(and(eq(integrations.workspaceId, context.workspaceId), eq(integrations.kind, 'outreach'))).limit(1);
  if (!integration) return reply({ error: 'Outreach connection is not configured.' }, 409);
  const steps = await context.db.select().from(campaignSteps).where(and(eq(campaignSteps.workspaceId, context.workspaceId), eq(campaignSteps.campaignId, campaignId))).orderBy(asc(campaignSteps.stepNumber)).limit(100);
  const selected = input.stepId ? steps.find((step) => step.id === input.stepId) : undefined;
  if (input.action !== 'create' && !selected) return reply({ error: 'Follow-up not found.' }, 404);
  try {
    const provider = new OutreachProvider(await decryptSecret(integration.credentialsCiphertext));
    if (input.action === 'delete') {
      if (!selected?.externalIdCiphertext) return reply({ error: 'This follow-up is not connected for editing.' }, 409);
      await provider.deleteFollowup(Number(await decryptSecret(selected.externalIdCiphertext)));
    } else {
      const fields = { subject: input.useOriginalSubject ? '' : (input.subject ?? ''), body: input.body ?? '', waitMin: input.waitMin!, waitUnits: input.waitUnits!, useOriginalSubject: Boolean(input.useOriginalSubject), sendInSameThread: Boolean(input.sendInSameThread) };
      if (input.action === 'update') {
        if (!selected?.externalIdCiphertext) return reply({ error: 'This follow-up is not connected for editing.' }, 409);
        await provider.updateFollowup(Number(await decryptSecret(selected.externalIdCiphertext)), fields);
      } else {
        const source = steps.find((step) => step.settings && typeof step.settings === 'object' && 'sequenceExternalIdCiphertext' in step.settings);
        const encryptedSequence = source?.settings && typeof source.settings === 'object' && 'sequenceExternalIdCiphertext' in source.settings ? String(source.settings.sequenceExternalIdCiphertext) : '';
        if (!encryptedSequence) return reply({ error: 'Synchronize this campaign once before adding a follow-up.' }, 409);
        await provider.createFollowup(Number(await decryptSecret(encryptedSequence)), fields);
      }
    }
    return reply({ saved: true, refreshRequired: true });
  } catch (error) {
    return reply({ error: error instanceof Error && error.message === 'RATE_LIMITED' ? 'Update limit reached. Please wait and try again.' : 'Follow-up changes could not be saved. Please try again.' }, 502);
  }
}
