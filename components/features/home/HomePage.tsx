import { getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/routing';
import { PublicLayout } from '@/components/layout/PublicLayout';
import { EquipoSlider } from '@/components/features/home/EquipoSlider';
import { TestimoniosSection } from '@/components/features/home/TestimoniosSection';
import { FaqSection } from '@/components/features/home/FaqSection';
import {
  OpenWelcomeModalButton,
  WelcomeModalProvider,
} from '@/components/features/home/WelcomeModal';
import './index-legacy.css';

export async function HomePage() {
  const t = await getTranslations('home');

  return (
    <PublicLayout>
      <WelcomeModalProvider>
        <section className="hero hero-modern" id="inicio">
          <div className="index-hero-gradient" />
          <div
            className="index-hero-bg"
            style={{ backgroundImage: "url('/images/hero.jpg')" }}
          />
          <div className="index-hero-blurs">
            <div className="index-hero-blur index-hero-blur-1" />
            <div className="index-hero-blur index-hero-blur-2" />
            <div className="index-hero-blur index-hero-blur-3" />
          </div>
          <div className="index-hero-content">
            <div className="index-hero-text">
              <h1 className="index-hero-title">
                <span>{t('heroTitle')} </span>
                <span className="text-gradient">{t('heroHighlight')}</span>
              </h1>
              <p className="index-hero-subtitle">{t('heroSubtitle')}</p>
              <div className="index-hero-buttons">
                <OpenWelcomeModalButton
                  id="btn-comenzar-ahora"
                  className="btn-hero-primary glass-effect"
                >
                  {t('bookNow')}
                </OpenWelcomeModalButton>
                <a href="#servicios" className="btn-hero-secondary">
                  {t('learnMore')}
                </a>
              </div>
            </div>
            <div className="index-hero-image-wrap">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/images/hero.jpg"
                alt="Bienestar emocional"
                className="index-hero-image floating"
              />
            </div>
          </div>
        </section>

        <section className="servicios-container index-section index-servicios-wrap" id="servicios">
          <h2 className="index-section-title">{t('servicesTitle')}</h2>
          <p className="index-section-desc">{t('servicesSubtitle')}</p>
          <div className="servicios-grid servicios-grid-modern">
            <OpenWelcomeModalButton className="servicio-card-modern servicio-card-v2 btn-abrir-modal-agendar">
              <div className="servicio-icon-wrap servicio-icon-rosa">
                <span className="servicio-card-icon servicio-card-icon-rosa">💻</span>
              </div>
              <h3>{t('serviceOnlineTitle')}</h3>
              <p>{t('serviceOnlineText')}</p>
              <span className="servicio-card-link">{t('serviceOnlineCta')}</span>
            </OpenWelcomeModalButton>

            <Link href="/academia" className="servicio-card-modern servicio-card-v2">
              <div className="servicio-icon-wrap servicio-icon-azul">
                <span className="servicio-card-icon servicio-card-icon-azul">👩‍🏫</span>
              </div>
              <h3>{t('serviceAcademyTitle')}</h3>
              <p>{t('serviceAcademyText')}</p>
              <span className="servicio-card-link">{t('serviceAcademyCta')}</span>
            </Link>

            <Link
              href="/catalogo?servicio=Asesoria%20de%20crianza"
              className="servicio-card-modern servicio-card-v2"
            >
              <div className="servicio-icon-wrap servicio-icon-dorado">
                <span className="servicio-card-icon servicio-card-icon-dorado">👩‍🍼</span>
              </div>
              <h3>{t('serviceParentingTitle')}</h3>
              <p>{t('serviceParentingText')}</p>
              <span className="servicio-card-link">{t('serviceParentingCta')}</span>
            </Link>
          </div>
        </section>

        <section
          className="sobre-nosotros index-section index-section-alt index-sobre-nosotros-wrap"
          id="sobre-nosotros"
        >
          <div className="about-wrapper index-about-wrapper">
            <div className="contenedor-flex">
              <div className="texto-nosotros index-texto-nosotros">
                <span className="subtitulo">{t('aboutLabel')}</span>
                <h2 className="index-sobre-title">{t('aboutTitle')}</h2>
                <p className="highlight-p index-sobre-p">{t('aboutP1')}</p>
                <p className="index-sobre-p">{t('aboutP2')}</p>
              </div>
              <div className="imagen-nosotros-container">
                <a href="#testimonios-section" className="cuadro-decorativo-v2">
                  <span className="cifra">{t('aboutStat')}</span>
                  <p className="bajada">{t('aboutStatLabel')}</p>
                </a>
              </div>
            </div>
          </div>
        </section>

        <EquipoSlider />
        <TestimoniosSection />
        <FaqSection />

        <section className="index-cta-section">
          <div className="index-cta-gradient" />
          <div className="index-cta-content">
            <h2 className="index-cta-title">{t('ctaTitle')}</h2>
            <p className="index-cta-desc">{t('ctaSubtitle')}</p>
            <OpenWelcomeModalButton
              id="btn-cta-agendar"
              className="btn-hero-primary glass-effect"
            >
              {t('ctaButton')}
            </OpenWelcomeModalButton>
          </div>
        </section>
      </WelcomeModalProvider>
    </PublicLayout>
  );
}
