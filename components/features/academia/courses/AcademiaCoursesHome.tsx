import { getTranslations } from 'next-intl/server';
import { AcademiaGrid } from '@/components/features/academia/AcademiaGrid';
import { CourseCatalogGrid } from '@/components/features/academia/courses/CourseCatalogGrid';
import { Link } from '@/i18n/routing';

export async function AcademiaCoursesHome() {
  const t = await getTranslations('academia');

  return (
    <>
      <section className="hero-academia">
        <div className="hero-content">
          <h1>{t('title')}</h1>
          <p>{t('heroTagline')}</p>
          <div className="mt-4 flex flex-wrap gap-3">
            <Link
              href="/academia/login"
              className="rounded-md bg-white px-4 py-2 text-sm font-medium text-primary shadow"
            >
              Acceder a mis cursos
            </Link>
          </div>
        </div>
      </section>

      <main className="academia-container mx-auto max-w-6xl px-4 py-10">
        <div className="mb-8">
          <span className="subtitulo text-sm font-medium text-primary">En línea</span>
          <h2 className="titulo-seccion text-2xl font-bold">Catálogo de cursos</h2>
          <p className="mt-2 text-muted-foreground">
            Cursos y talleres virtuales con acceso inmediato tras tu inscripción.
          </p>
        </div>
        <CourseCatalogGrid />

        <div className="mt-16 border-t pt-12">
          <div className="seccion-titulo mb-6">
            <span className="subtitulo">{t('upcomingLabel')}</span>
            <h2>{t('offerTitle')}</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Diplomados y programas presenciales / híbridos (información vía WhatsApp).
            </p>
          </div>
          <AcademiaGrid />
        </div>
      </main>
    </>
  );
}
