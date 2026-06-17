import LegacyPage, { legacyMetadata } from '@/components/legacy/LegacyPage';

export const metadata = legacyMetadata('catalogo');

export default function CatalogoPage() {
  return <LegacyPage view="catalogo" />;
}
