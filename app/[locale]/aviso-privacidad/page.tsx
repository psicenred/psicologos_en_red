import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { AvisoPrivacidadContent } from '@/components/features/legal/AvisoPrivacidadContent';
import { LegalDocument } from '@/components/layout/LegalDocument';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('legal.privacy');
  return { title: t('pageTitle') };
}

export default async function AvisoPrivacidadPage() {
  const t = await getTranslations('legal.privacy');

  return (
    <LegalDocument title={t('title')} subtitle={t('subtitle')}>
      <AvisoPrivacidadContent />
    </LegalDocument>
  );
}
