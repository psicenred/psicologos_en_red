import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { Suspense } from 'react';
import { PublicLayout } from '@/components/layout/PublicLayout';
import { CatalogoClient } from '@/components/features/catalogo/CatalogoClient';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('catalog');
  return { title: t('title'), description: t('subtitle') };
}

export default async function CatalogoPage() {
  const t = await getTranslations('catalog');

  return (
    <PublicLayout>
      <Suspense fallback={<p className="py-20 text-center text-muted-foreground">{t('loading')}</p>}>
        <CatalogoClient />
      </Suspense>
    </PublicLayout>
  );
}
