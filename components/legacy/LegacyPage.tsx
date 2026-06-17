import type { Metadata } from 'next';
import LegacyPageClient from '@/components/legacy/LegacyPageClient';
import {
  loadLegacyView,
  type LegacyViewName,
} from '@/lib/legacy-view';

interface LegacyPageProps {
  view: LegacyViewName;
}

export function legacyMetadata(view: LegacyViewName): Metadata {
  const { title } = loadLegacyView(view);
  return { title };
}

export default function LegacyPage({ view }: LegacyPageProps) {
  const { bodyHtml } = loadLegacyView(view);
  return <LegacyPageClient html={bodyHtml} />;
}
