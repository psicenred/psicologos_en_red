import LegacyPage, { legacyMetadata } from '@/components/legacy/LegacyPage';

export const metadata = legacyMetadata('panel-admin');

export default function PanelAdminPage() {
  return <LegacyPage view="panel-admin" />;
}
