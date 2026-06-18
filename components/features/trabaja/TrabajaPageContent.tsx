import { getTranslations } from 'next-intl/server';
import { TrabajaAplicacionForm } from '@/components/features/trabaja/TrabajaAplicacionForm';
import './trabaja-legacy.css';

const BENEFIT_KEYS = ['remote', 'schedule', 'income', 'growth', 'platform'] as const;

export async function TrabajaPageContent() {
  const t = await getTranslations('trabaja');

  return (
    <>
      <section className="trabaja-hero">
        <h1>{t('heroTitle')}</h1>
        <p>{t('heroSubtitle')}</p>
      </section>

      <div className="trabaja-container">
        <div className="trabaja-beneficios">
          <h2>{t('benefitsTitle')}</h2>

          {BENEFIT_KEYS.map((key) => (
            <div key={key} className="beneficio-item">
              <div className="beneficio-icon">{t(`benefits.${key}.icon`)}</div>
              <div className="beneficio-content">
                <h3>{t(`benefits.${key}.title`)}</h3>
                <p>{t(`benefits.${key}.text`)}</p>
              </div>
            </div>
          ))}
        </div>

        <TrabajaAplicacionForm />
      </div>
    </>
  );
}
