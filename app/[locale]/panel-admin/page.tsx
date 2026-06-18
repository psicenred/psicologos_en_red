import type { Metadata } from 'next';
import { PanelAdminApp } from '@/components/features/dashboard/PanelAdminApp';

export const metadata: Metadata = { title: 'Panel Admin' };

export default function PanelAdminPage() {
  return <PanelAdminApp />;
}
