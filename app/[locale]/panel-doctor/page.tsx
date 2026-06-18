import type { Metadata } from 'next';
import { PanelDoctorApp } from '@/components/features/dashboard/PanelDoctorApp';

export const metadata: Metadata = { title: 'Panel Psicólogo' };

export default function PanelDoctorPage() {
  return <PanelDoctorApp />;
}
