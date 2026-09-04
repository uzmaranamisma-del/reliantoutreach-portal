import SectionView from '@/components/section-view';
import { redirect } from 'next/navigation';
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
]);
export default async function SectionPage({
  params,
}: {
  params: Promise<{ section: string }>;
}) {
  const { section } = await params;
  if (section === 'dashboard') redirect('/');
  return <SectionView section={allowed.has(section) ? section : 'prospects'} />;
}
