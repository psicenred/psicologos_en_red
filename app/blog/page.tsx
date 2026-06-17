import LegacyPage, { legacyMetadata } from '@/components/legacy/LegacyPage';

export const metadata = legacyMetadata('blog');

export default function BlogPage() {
  return <LegacyPage view="blog" />;
}
