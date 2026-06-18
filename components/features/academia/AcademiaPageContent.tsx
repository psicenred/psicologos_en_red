import Image from 'next/image';
import { getTranslations } from 'next-intl/server';
import { AcademiaGrid } from '@/components/features/academia/AcademiaGrid';

const BENEFIT_KEYS = ['excellence', 'flexibility', 'human', 'certificate'] as const;

export async function AcademiaPageContent() {
  const t = await getTranslations('academia');

  return (
    <>
      <section className="hero-academia">
        <div className="hero-content">
          <h1>{t('title')}</h1>
          <p>{t('heroTagline')}</p>
        </div>
      </section>

      <section className="bienvenida-academia">
        <div className="bienvenida-content">
          <div className="bienvenida-texto">
            <span className="subtitulo">{t('welcomeLabel')}</span>
            <h2>{t('welcomeTitle')}</h2>
            <p>{t('welcomeP1')}</p>
            <p>{t('welcomeP2')}</p>
          </div>
          <div className="bienvenida-decoracion">
            <div className="box-decorativa flex items-center justify-center">
              <Image
                src="/images/logo.png"
                alt="Logo Psicólogos en Red"
                width={200}
                height={200}
                className="max-h-[80%] max-w-[80%] object-contain"
              />
            </div>
          </div>
        </div>
      </section>

      <section className="seccion-directora">
        <div className="directora-container">
          <div className="directora-imagen">
            <Image
              src="/images/lucy-sin-fondo.png"
              alt={t('directorName')}
              width={400}
              height={500}
              className="h-auto w-full max-w-[400px]"
            />
          </div>
          <div className="directora-mensaje">
            <div className="comillas">“</div>
            <p dangerouslySetInnerHTML={{ __html: t.raw('directorQuote') }} />
            <div className="directora-firma">
              <h4>{t('directorName')}</h4>
              <span>{t('directorRole')}</span>
            </div>
          </div>
        </div>
      </section>

      <section className="seccion-coordinadora">
        <div className="directora-container espejo">
          <div className="directora-mensaje">
            <div className="comillas">“</div>
            <p dangerouslySetInnerHTML={{ __html: t.raw('coordinatorQuote') }} />
            <div className="directora-firma">
              <h4>{t('coordinatorName')}</h4>
              <span>{t('coordinatorRole')}</span>
            </div>
          </div>
          <div className="directora-imagen">
            <Image
              src="/images/alejandra-sin-fondo.png"
              alt={t('coordinatorName')}
              width={400}
              height={500}
              className="h-auto w-full max-w-[400px]"
            />
          </div>
        </div>
      </section>

      <section className="por-que-elegirnos">
        <div className="seccion-titulo">
          <span className="subtitulo">{t('pillarsLabel')}</span>
          <h2>{t('pillarsTitle')}</h2>
        </div>
        <div className="beneficios-grid">
          {BENEFIT_KEYS.map((key) => (
            <div key={key} className="beneficio-item">
              <div className="beneficio-icono">{t(`benefits.${key}.icon`)}</div>
              <h3>{t(`benefits.${key}.title`)}</h3>
              <p dangerouslySetInnerHTML={{ __html: t.raw(`benefits.${key}.text`) }} />
            </div>
          ))}
        </div>
      </section>

      <main className="academia-container">
        <div className="academia-header">
          <h2 className="titulo-seccion">{t('programsTitle')}</h2>
        </div>
        <section>
          <div className="seccion-titulo">
            <span className="subtitulo">{t('upcomingLabel')}</span>
            <h2>{t('offerTitle')}</h2>
          </div>
          <AcademiaGrid />
        </section>
      </main>
    </>
  );
}
