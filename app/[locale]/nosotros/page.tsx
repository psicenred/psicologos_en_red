import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { PublicLayout } from '@/components/layout/PublicLayout';
import { TeamCarousel } from '@/components/features/nosotros/TeamCarousel';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('nosotros');
  return { title: t('title') };
}

export default async function NosotrosPage() {
  const t = await getTranslations('nosotros');

  return (
    <PublicLayout>
      <section className="mx-auto max-w-7xl px-4 py-16">
        <h1 className="text-center text-4xl font-bold text-primary">{t('title')}</h1>
        <p className="mx-auto mt-4 max-w-2xl text-center text-muted-foreground">{t('intro')}</p>
        <TeamCarousel />
        <div className="mx-auto mt-16 max-w-2xl space-y-4 text-center text-muted-foreground">
          <p>{t('mission1')}</p>
          <p>{t('mission2')}</p>
        </div>
      </section>
    </PublicLayout>
  );
}
