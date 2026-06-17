import LegacyPage, { legacyMetadata } from '@/components/legacy/LegacyPage';

export const metadata = legacyMetadata('login');

export default function LoginPage() {
  return <LegacyPage view="login" />;
}
