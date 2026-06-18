import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { PublicLayout } from '@/components/layout/PublicLayout';
import { BlogList } from '@/components/features/blog/BlogViews';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('blog');
  return { title: t('metaTitle'), description: t('metaDescription') };
}

export default function BlogPage() {
  return (
    <PublicLayout>
      <BlogList />
    </PublicLayout>
  );
}
