import LegacyPage, { legacyMetadata } from '@/components/legacy/LegacyPage';

export const metadata = legacyMetadata('index');

export default function HomePage() {
  return <LegacyPage view="index" />;
}
