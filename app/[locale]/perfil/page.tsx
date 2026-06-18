import type { Metadata } from 'next';
import { PerfilApp } from '@/components/features/dashboard/PerfilApp';

export const metadata: Metadata = { title: 'Mi Perfil' };

export default function PerfilPage() {
  return <PerfilApp />;
}
