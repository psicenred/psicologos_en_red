'use client';

import { useEffect, useMemo, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { Link } from '@/i18n/routing';
import { fetchJsonArray } from '@/lib/fetch-api';
import './blog-legacy.css';

export type Articulo = {
  id: number;
  titulo: string;
  slug: string;
  autor: string;
  tiempo_lectura: number | string | null;
  extracto: string | null;
  portada_url: string | null;
  fecha_publicacion: string;
  palabras_clave?: string[] | null;
  contenido_html?: string;
  meta_title?: string | null;
  meta_description?: string | null;
};

function formatearFecha(iso: string, locale: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString(locale.startsWith('en') ? 'en-US' : 'es-MX', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function matchesFecha(art: Articulo, desde: string, hasta: string) {
  const f = new Date(art.fecha_publicacion);
  if (Number.isNaN(f.getTime())) return true;
  const solo = new Date(f.getFullYear(), f.getMonth(), f.getDate()).getTime();
  if (desde) {
    const fd = new Date(`${desde}T00:00:00`).getTime();
    if (solo < fd) return false;
  }
  if (hasta) {
    const fh = new Date(`${hasta}T23:59:59`).getTime();
    if (solo > fh) return false;
  }
  return true;
}

function lecturaLabel(min: number | string | null | undefined) {
  if (min == null || min === '') return '';
  const n = typeof min === 'number' ? min : parseInt(String(min), 10);
  if (Number.isNaN(n)) return String(min);
  return `${n} min`;
}

export function BlogList() {
  const t = useTranslations('blog');
  const locale = useLocale();
  const [articulos, setArticulos] = useState<Articulo[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [filtroTexto, setFiltroTexto] = useState('');
  const [filtroDesde, setFiltroDesde] = useState('');
  const [filtroHasta, setFiltroHasta] = useState('');

  useEffect(() => {
    fetchJsonArray<Articulo>('/api/blog-articulos').then(({ data, error }) => {
      setArticulos(data);
      setLoadError(error);
      setLoading(false);
    });
  }, []);

  const filtrados = useMemo(() => {
    const txt = filtroTexto.trim().toLowerCase();
    return articulos.filter((a) => {
      const kw = Array.isArray(a.palabras_clave) ? a.palabras_clave.join(' ') : '';
      const stack = `${a.titulo} ${kw}`.toLowerCase();
      const coincideTexto = !txt || stack.includes(txt);
      const coincideFecha = matchesFecha(a, filtroDesde, filtroHasta);
      return coincideTexto && coincideFecha;
    });
  }, [articulos, filtroTexto, filtroDesde, filtroHasta]);

  const resultado = loading
    ? t('loading')
    : loadError
      ? t('loadError')
      : t('showing', { count: filtrados.length });

  return (
    <main className="blog-main">
      <div className="blog-wrap">
        <section className="blog-hero">
          <span className="blog-kicker">{t('kicker')}</span>
          <h1 className="blog-title">{t('title')}</h1>
          <p className="blog-subtitle">{t('subtitle')}</p>
          <div className="blog-filtros">
            <input
              type="text"
              id="filtro-texto"
              className="blog-filtro-texto"
              placeholder={t('searchPlaceholder')}
              value={filtroTexto}
              onChange={(e) => setFiltroTexto(e.target.value)}
            />
            <input
              type="date"
              id="filtro-desde"
              className="blog-filtro-fecha blog-filtro-desde"
              aria-label={t('dateFrom')}
              value={filtroDesde}
              onChange={(e) => setFiltroDesde(e.target.value)}
            />
            <input
              type="date"
              id="filtro-hasta"
              className="blog-filtro-fecha"
              aria-label={t('dateTo')}
              value={filtroHasta}
              onChange={(e) => setFiltroHasta(e.target.value)}
            />
            <button
              type="button"
              id="btn-limpiar-filtros"
              className="blog-filtro-limpiar"
              onClick={() => {
                setFiltroTexto('');
                setFiltroDesde('');
                setFiltroHasta('');
              }}
            >
              {t('clearFilters')}
            </button>
          </div>
          <p className="blog-resultado" id="blog-resultado">
            {resultado}
          </p>
        </section>

        <section className="blog-grid" id="blog-grid">
          {loadError ? (
            <div className="blog-error">
              {t('dbUnavailable')}
              <p style={{ fontSize: '0.8rem', marginTop: 8, opacity: 0.8 }}>{loadError}</p>
            </div>
          ) : loading ? null : filtrados.length === 0 ? (
            <div className="blog-empty">{t('empty')}</div>
          ) : (
            filtrados.map((a) => {
              const etiqueta =
                Array.isArray(a.palabras_clave) && a.palabras_clave.length
                  ? a.palabras_clave[0]
                  : t('defaultTag');
              const extracto = a.extracto || t('noExcerpt');
              const lectura = lecturaLabel(a.tiempo_lectura);

              return (
                <article key={a.id} className="blog-card">
                  {a.portada_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      className="blog-card-cover"
                      src={a.portada_url}
                      alt={a.titulo}
                    />
                  ) : null}
                  <span className="tag">{etiqueta}</span>
                  <h2>{a.titulo || t('untitled')}</h2>
                  <p>{extracto}</p>
                  <p className="blog-meta">
                    {t('published')}: {formatearFecha(a.fecha_publicacion, locale)}
                    {lectura ? ` · ${lectura}` : ''}
                  </p>
                  <div className="blog-card-actions">
                    <Link href={`/blog/${a.slug}`} className="blog-card-link">
                      {t('readArticle')}
                    </Link>
                  </div>
                </article>
              );
            })
          )}
        </section>
      </div>
    </main>
  );
}

export function BlogArticle({ slug }: { slug: string }) {
  const t = useTranslations('blog');
  const locale = useLocale();
  const [articulo, setArticulo] = useState<Articulo | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    fetchJsonArray<Articulo>('/api/blog-articulos').then(({ data }) => {
      const found = data.find((a) => a.slug === slug) ?? null;
      setArticulo(found);
      setNotFound(!found);
      setLoading(false);
    });
  }, [slug]);

  if (loading) {
    return (
      <main className="blog-main">
        <div className="blog-wrap">
          <p className="blog-resultado">{t('loadingArticle')}</p>
        </div>
      </main>
    );
  }

  if (notFound || !articulo) {
    return (
      <main className="blog-main">
        <div className="blog-wrap">
          <div className="blog-empty">{t('notFound')}</div>
          <Link href="/blog" className="blog-articulo-back">
            ← {t('backToBlog')}
          </Link>
        </div>
      </main>
    );
  }

  const lectura = lecturaLabel(articulo.tiempo_lectura);

  return (
    <main className="blog-main">
      <div className="blog-wrap">
        <section className="blog-articulo-view visible">
          <Link href="/blog" className="blog-articulo-back">
            ← {t('backToBlog')}
          </Link>
          <article className="blog-articulo-card">
            <h1>{articulo.titulo}</h1>
            <p className="blog-meta">
              {t('published')}: {formatearFecha(articulo.fecha_publicacion, locale)} ·{' '}
              {articulo.autor || t('defaultAuthor')}
              {lectura ? ` · ${lectura}` : ''}
            </p>
            <div
              className="blog-articulo-content"
              dangerouslySetInnerHTML={{ __html: articulo.contenido_html || `<p>${t('noContent')}</p>` }}
            />
          </article>
        </section>
      </div>
    </main>
  );
}
