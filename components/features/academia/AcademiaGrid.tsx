'use client';

import { useEffect, useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/routing';
import { CurriculumDisplay } from '@/components/features/academia/courses/CurriculumDisplay';
import { fetchJsonArray } from '@/lib/fetch-api';
import type { AcademiaCatalogCourse } from '@/lib/academia/catalog';

const WA_NUM = '525530776194';
const FALLBACK_IMG =
  'https://images.unsplash.com/photo-1573497019940-1c28c88b4f3e?auto=format&fit=crop&w=800&q=80';

type Diplomado = {
  id: number;
  area: string;
  titulo: string;
  fecha_inicio: string;
  descripcion_corta: string;
  descripcion_larga: string;
  url_imagen: string;
  mensaje_whatsapp: string;
};

type GridItem =
  | { source: 'diplomado'; key: string; data: Diplomado }
  | { source: 'course'; key: string; data: AcademiaCatalogCourse };

export function AcademiaGrid({
  platformCourses = [],
}: {
  platformCourses?: AcademiaCatalogCourse[];
}) {
  const t = useTranslations('academia');
  const [diplomados, setDiplomados] = useState<Diplomado[]>([]);
  const [selected, setSelected] = useState<GridItem | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loadingDiplomados, setLoadingDiplomados] = useState(true);

  useEffect(() => {
    fetchJsonArray<Diplomado>('/api/diplomados').then(({ data, error }) => {
      setDiplomados(data);
      setLoadError(error);
      setLoadingDiplomados(false);
    });
  }, []);

  const items = useMemo<GridItem[]>(() => {
    const legacy: GridItem[] = diplomados.map((d) => ({
      source: 'diplomado',
      key: `diplomado-${d.id}`,
      data: d,
    }));
    const platform: GridItem[] = platformCourses.map((c) => ({
      source: 'course',
      key: `course-${c.id}`,
      data: c,
    }));
    return [...legacy, ...platform];
  }, [diplomados, platformCourses]);

  useEffect(() => {
    if (!selected) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setSelected(null);
    };
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', onKey);
    };
  }, [selected]);

  const loading = loadingDiplomados && items.length === 0;

  return (
    <>
      {loadError ? (
        <div className="mb-6 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          {t('dbUnavailable')}
          <p className="mt-1 text-xs opacity-80">{loadError}</p>
        </div>
      ) : null}

      <div className="curso-grid">
        {loading ? (
          <p className="col-span-full py-10 text-center text-[#666]">{t('loading')}</p>
        ) : items.length === 0 && !loadError ? (
          <p className="col-span-full py-10 text-center text-[#666]">{t('empty')}</p>
        ) : (
          items.map((item) => {
            const isCourse = item.source === 'course';
            const d = item.data;
            const imgUrl = (d.url_imagen || '').trim() || FALLBACK_IMG;
            const titulo = d.titulo;
            const area = d.area;
            const descripcion = d.descripcion_corta;
            const fechaInicio = isCourse
              ? item.data.fecha_inicio
              : (d as Diplomado).fecha_inicio;

            const waText =
              !isCourse && (d as Diplomado).mensaje_whatsapp
                ? (d as Diplomado).mensaje_whatsapp
                : `Hola! Deseo más información del Diplomado: ${titulo || ''}`;
            const waHref = `https://wa.me/${WA_NUM}?text=${encodeURIComponent(waText)}`;

            const tieneVerMas = isCourse
              ? item.data.has_curriculum
              : ((d as Diplomado).descripcion_larga || '').trim().length > 0;

            return (
              <div key={item.key} className="curso-card">
                <div
                  className="curso-img"
                  style={{ backgroundImage: `url('${imgUrl}')` }}
                  role="img"
                  aria-label={titulo}
                />
                <div className="curso-body">
                  <span className="curso-tag">{area}</span>
                  <h3>{titulo}</h3>
                  {fechaInicio ? (
                    <p className="curso-fecha">
                      📅 {t('starts')}: {fechaInicio}
                    </p>
                  ) : null}
                  <p>{descripcion}</p>
                  {tieneVerMas ? (
                    <div className="curso-botones">
                      <button
                        type="button"
                        className="btn-curso btn-curso-vermas"
                        onClick={() => setSelected(item)}
                      >
                        {t('seeMore')}
                      </button>
                      {isCourse ? (
                        <Link href={`/academia/${item.data.slug}`} className="btn-curso">
                          {t('enrollNow')}
                        </Link>
                      ) : (
                        <a
                          href={waHref}
                          className="btn-curso"
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          {t('moreInfo')}
                        </a>
                      )}
                    </div>
                  ) : isCourse ? (
                    <Link href={`/academia/${item.data.slug}`} className="btn-curso">
                      {t('enrollNow')}
                    </Link>
                  ) : (
                    <a
                      href={waHref}
                      className="btn-curso"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      {t('moreInfo')}
                    </a>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {selected ? (
        <div
          className="modal-diplomado-overlay"
          role="dialog"
          aria-modal="true"
          aria-labelledby="modal-diplomado-titulo"
          onClick={(e) => {
            if (e.target === e.currentTarget) setSelected(null);
          }}
        >
          <div className="modal-diplomado-box">
            <button
              type="button"
              className="modal-diplomado-cerrar"
              onClick={() => setSelected(null)}
              aria-label={t('close')}
            >
              &times;
            </button>
            {(selected.data.url_imagen || '').trim() ? (
              <div className="modal-diplomado-img-wrap">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={selected.data.url_imagen}
                  alt={selected.data.titulo}
                  className="modal-diplomado-img"
                />
              </div>
            ) : null}
            <span className="curso-tag">{selected.data.area}</span>
            <h2 id="modal-diplomado-titulo" className="modal-diplomado-titulo">
              {selected.data.titulo}
            </h2>
            {selected.source === 'course' && selected.data.fecha_inicio ? (
              <p className="curso-fecha">
                📅 {t('starts')}: {selected.data.fecha_inicio}
              </p>
            ) : selected.source === 'diplomado' ? (
              <p className="curso-fecha">
                📅 {t('starts')}: {selected.data.fecha_inicio}
              </p>
            ) : null}

            {selected.source === 'course' ? (
              <div className="modal-diplomado-body">
                <h3 className="mb-3 text-base font-semibold text-[#333]">{t('curriculumTitle')}</h3>
                <CurriculumDisplay raw={selected.data.curriculum} variant="outline" />
              </div>
            ) : (
              <div
                className="modal-diplomado-body"
                dangerouslySetInnerHTML={{
                  __html: (selected.data as Diplomado).descripcion_larga,
                }}
              />
            )}

            {selected.source === 'course' ? (
              <Link href={`/academia/${selected.data.slug}`} className="btn-curso">
                {t('enrollNow')}
              </Link>
            ) : (
              <a
                href={`https://wa.me/${WA_NUM}?text=${encodeURIComponent(
                  (selected.data as Diplomado).mensaje_whatsapp ||
                    `Hola! Deseo más información del Diplomado: ${selected.data.titulo || ''}`,
                )}`}
                className="btn-curso"
                target="_blank"
                rel="noopener noreferrer"
              >
                {t('whatsapp')}
              </a>
            )}
          </div>
        </div>
      ) : null}
    </>
  );
}
