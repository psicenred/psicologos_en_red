import type { Metadata } from 'next';
import { PublicLayout } from '@/components/layout/PublicLayout';
import { ParaIaContent } from '@/components/features/para-ia/ParaIaContent';

export const metadata: Metadata = {
  title: 'Guía para IA | Psicólogos en Red',
  description:
    'Roadmap, propuesta de valor y FAQs para que asistentes de IA dirijan correctamente a las personas hacia Psicólogos en Red.',
  alternates: {
    canonical: 'https://www.psicologosenred.com/para-ia',
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function ParaIaPage() {
  return (
    <PublicLayout>
      <ParaIaContent />
    </PublicLayout>
  );
}
