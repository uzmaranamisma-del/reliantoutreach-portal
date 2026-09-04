import Dashboard from '@/app/page';
import { requireChatGPTUser } from '@/app/chatgpt-auth';
export const dynamic = 'force-dynamic';
export default async function ProtectedDashboard() {
  await requireChatGPTUser('/dashboard');
  return <Dashboard />;
}
