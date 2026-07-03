import { getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/routing';

export async function AcademiaHeroLoginCta() {
  const t = await getTranslations('academia');

  return (
    <Link href="/academia/login" className="btn-academia-acceso">
      {t('heroLoginCta')}
    </Link>
  );
}
