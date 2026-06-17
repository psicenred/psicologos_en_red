import LegacyPage, { legacyMetadata } from '@/components/legacy/LegacyPage';

export const metadata = legacyMetadata('blog');

export default function BlogArticuloPage() {
  return <LegacyPage view="blog" />;
}
