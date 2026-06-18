import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { TerminosContent } from '@/components/features/legal/TerminosContent';
import { LegalDocument } from '@/components/layout/LegalDocument';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('legal.terms');
  return { title: t('pageTitle') };
}

export default async function TerminosPage() {
  const t = await getTranslations('legal.terms');

  return (
    <LegalDocument title={t('title')} subtitle={t('subtitle')}>
      <TerminosContent />
    </LegalDocument>
  );
}
