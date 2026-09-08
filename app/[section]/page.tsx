import SectionView from '@/components/section-view';
import { redirect } from 'next/navigation';
import { requireChatGPTUser } from '@/app/chatgpt-auth';
import { getWorkspaceContext } from '@/lib/workspace-context';
export const dynamic = 'force-dynamic';
const allowed = new Set([
  'dashboard',
  'prospects',
  'campaigns',
  'replies',
  'email-accounts',
  'domains',
  'meetings',
  'analytics',
  'files',
  'team',
  'settings',
  'clients',
]);
export default async function SectionPage({
  params,
}: {
  params: Promise<{ section: string }>;
}) {
  const { section } = await params;
  await requireChatGPTUser(`/${section}`);
  if (!(await getWorkspaceContext())) redirect('/unauthorized');
  if (section === 'dashboard') redirect('/dashboard');
  return <SectionView section={allowed.has(section) ? section : 'prospects'} />;
}
