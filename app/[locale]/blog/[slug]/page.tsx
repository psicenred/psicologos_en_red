import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { PublicLayout } from '@/components/layout/PublicLayout';
import { BlogArticle } from '@/components/features/blog/BlogViews';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const t = await getTranslations('blog');
  return {
    title: slug ? `${slug} | ${t('metaTitle')}` : t('metaTitle'),
  };
}

export default async function BlogSlugPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  return (
    <PublicLayout>
      <BlogArticle slug={slug} />
    </PublicLayout>
  );
}
