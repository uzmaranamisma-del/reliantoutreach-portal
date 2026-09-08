import Dashboard from '@/app/page';
import { requireChatGPTUser } from '@/app/chatgpt-auth';
import { getWorkspaceContext } from '@/lib/workspace-context';
import { redirect } from 'next/navigation';
export const dynamic = 'force-dynamic';
export default async function ProtectedDashboard() {
  await requireChatGPTUser('/dashboard');
  if (!(await getWorkspaceContext())) redirect('/unauthorized');
  return <Dashboard />;
}
