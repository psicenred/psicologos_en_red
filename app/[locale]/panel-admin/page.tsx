import type { Metadata } from 'next';
import { PanelAdminApp } from '@/components/features/dashboard/PanelAdminApp';
import { loadAdminPanelData } from '@/lib/admin/server-data';

export const metadata: Metadata = { title: 'Panel Admin' };

export default async function PanelAdminPage() {
  const initialData = await loadAdminPanelData();
  return <PanelAdminApp initialData={initialData} />;
}
