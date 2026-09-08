import { requireChatGPTUser } from '@/app/chatgpt-auth';
import CampaignWorkspace from '@/components/campaign-workspace';
import { getWorkspaceContext } from '@/lib/workspace-context';
import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';

export default async function CampaignPage({
  params,
}: {
  params: Promise<{ campaignId: string }>;
}) {
  const { campaignId } = await params;
  await requireChatGPTUser(`/campaigns/${campaignId}`);
  if (!(await getWorkspaceContext())) redirect('/unauthorized');
  return <CampaignWorkspace campaignId={campaignId} />;
}
