'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { fetchJsonArray } from '@/lib/fetch-api';

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

export function AcademiaGrid() {
  const t = useTranslations('academia');
  const [items, setItems] = useState<Diplomado[]>([]);
  const [selected, setSelected] = useState<Diplomado | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchJsonArray<Diplomado>('/api/diplomados').then(({ data, error }) => {
      setItems(data);
      setLoadError(error);
      setLoading(false);
    });
  }, []);

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
          items.map((d) => {
            const imgUrl = (d.url_imagen || '').trim() || FALLBACK_IMG;
            const waText =
              d.mensaje_whatsapp ||
              `Hola! Deseo más información del Diplomado: ${d.titulo || ''}`;
            const waHref = `https://wa.me/${WA_NUM}?text=${encodeURIComponent(waText)}`;
            const tieneVerMas = (d.descripcion_larga || '').trim().length > 0;

            return (
              <div key={d.id} className="curso-card">
                <div
                  className="curso-img"
                  style={{ backgroundImage: `url('${imgUrl}')` }}
                  role="img"
                  aria-label={d.titulo}
                />
                <div className="curso-body">
                  <span className="curso-tag">{d.area}</span>
                  <h3>{d.titulo}</h3>
                  <p className="curso-fecha">📅 {t('starts')}: {d.fecha_inicio}</p>
                  <p>{d.descripcion_corta}</p>
                  {tieneVerMas ? (
                    <div className="curso-botones">
                      <button
                        type="button"
                        className="btn-curso btn-curso-vermas"
                        onClick={() => setSelected(d)}
                      >
                        {t('seeMore')}
                      </button>
                      <a
                        href={waHref}
                        className="btn-curso"
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        {t('moreInfo')}
                      </a>
                    </div>
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
            {(selected.url_imagen || '').trim() ? (
              <div className="modal-diplomado-img-wrap">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={selected.url_imagen}
                  alt={selected.titulo}
                  className="modal-diplomado-img"
                />
              </div>
            ) : null}
            <span className="curso-tag">{selected.area}</span>
            <h2 id="modal-diplomado-titulo" className="modal-diplomado-titulo">
              {selected.titulo}
            </h2>
            <p className="curso-fecha">
              📅 {t('starts')}: {selected.fecha_inicio}
            </p>
            <div
              className="modal-diplomado-body"
              dangerouslySetInnerHTML={{ __html: selected.descripcion_larga }}
            />
            <a
              href={`https://wa.me/${WA_NUM}?text=${encodeURIComponent(
                selected.mensaje_whatsapp ||
                  `Hola! Deseo más información del Diplomado: ${selected.titulo || ''}`,
              )}`}
              className="btn-curso"
              target="_blank"
              rel="noopener noreferrer"
            >
              {t('whatsapp')}
            </a>
          </div>
        </div>
      ) : null}
    </>
  );
}

