import { requireChatGPTUser } from '@/app/chatgpt-auth';
import CampaignWorkspace from '@/components/campaign-workspace';

export const dynamic = 'force-dynamic';

export default async function CampaignPage({
  params,
}: {
  params: Promise<{ campaignId: string }>;
}) {
  const { campaignId } = await params;
  await requireChatGPTUser(`/campaigns/${campaignId}`);
  return <CampaignWorkspace campaignId={campaignId} />;
}
