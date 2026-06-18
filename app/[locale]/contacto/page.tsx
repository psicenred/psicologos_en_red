import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { PublicLayout } from '@/components/layout/PublicLayout';
import { ContactoPageContent } from '@/components/features/contacto/ContactoPageContent';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('contacto');
  return { title: t('pageTitle') };
}

export default function ContactoPage() {
  return (
    <PublicLayout>
      <ContactoPageContent />
    </PublicLayout>
  );
}
