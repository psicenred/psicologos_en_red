import { getTranslations } from 'next-intl/server';
import { ContactoForm } from '@/components/features/contacto/ContactoForm';
import { ContactoRedes } from '@/components/features/contacto/ContactoRedes';
import './contacto-legacy.css';

export async function ContactoPageContent() {
  const t = await getTranslations('contacto');

  return (
    <>
      <section className="contacto-hero">
        <h1>{t('heroTitle')}</h1>
        <p>{t('heroSubtitle')}</p>
      </section>

      <div className="contacto-container">
        <div className="contacto-info">
          <h2>{t('infoTitle')}</h2>

          <div className="info-item">
            <div className="info-icon">📧</div>
            <div className="info-content">
              <h3>{t('emailTitle')}</h3>
              <p>
                <a href="mailto:contacto@psicologosenred.com">contacto@psicologosenred.com</a>
              </p>
            </div>
          </div>

          <div className="info-item">
            <div className="info-icon">📱</div>
            <div className="info-content">
              <h3>{t('whatsappTitle')}</h3>
              <p>
                <a href="https://wa.me/5215530776194" target="_blank" rel="noopener noreferrer">
                  +52 55 3077 6194
                </a>
              </p>
            </div>
          </div>

          <div className="info-item">
            <div className="info-icon">📍</div>
            <div className="info-content">
              <h3>{t('locationTitle')}</h3>
              <p>{t('location')}</p>
            </div>
          </div>

          <div className="info-item">
            <div className="info-icon">🕐</div>
            <div className="info-content">
              <h3>{t('hoursTitle')}</h3>
              <p>{t('hours')}</p>
            </div>
          </div>

          <ContactoRedes />
        </div>

        <ContactoForm />
      </div>
    </>
  );
}
