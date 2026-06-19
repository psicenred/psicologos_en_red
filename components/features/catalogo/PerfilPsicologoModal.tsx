'use client';

import { useEffect, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import type { Psicologo } from '@/components/features/catalogo/CatalogoClient';
import { useBodyScrollLock } from '@/lib/hooks/useBodyScrollLock';

type Opinion = {
  paciente_nombre: string;
  estrellas: number;
  comentario: string;
  fecha: string;
};

function stars(n: number) {
  const count = Math.min(5, Math.max(0, parseInt(String(n), 10) || 0));
  return '⭐'.repeat(count);
}

function formatDate(f: string) {
  if (!f) return '';
  return new Date(f).toLocaleDateString('es-MX', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function initials(nombre: string) {
  if (!nombre?.trim()) return '—';
  const parts = nombre.trim().split(/\s+/);
  if (parts.length >= 2) {
    return `${parts[0][0]}.${parts[parts.length - 1][0]}`.toUpperCase();
  }
  return parts[0].slice(0, 2).toUpperCase();
}

export function PerfilPsicologoModal({
  psicologoId,
  onClose,
  onAgendar,
}: {
  psicologoId: number;
  onClose: () => void;
  onAgendar: (p: Psicologo) => void;
}) {
  const t = useTranslations('catalog');
  const [data, setData] = useState<{ datos: Psicologo; opiniones: Opinion[] } | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const onCloseRef = useRef(onClose);

  onCloseRef.current = onClose;

  useBodyScrollLock(true);

  useEffect(() => {
    const controller = new AbortController();
    let cancelled = false;

    setData(null);
    setLoadError(false);
    setLoading(true);

    fetch(`/api/psicologo/${psicologoId}`, { signal: controller.signal })
      .then(async (r) => {
        if (!r.ok) throw new Error('fail');
        return r.json();
      })
      .then((json) => {
        if (cancelled) return;
        setData(json);
      })
      .catch((err: unknown) => {
        if (cancelled || (err instanceof DOMException && err.name === 'AbortError')) return;
        setData(null);
        setLoadError(true);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [psicologoId]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCloseRef.current();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const p = data?.datos;

  return (
    <div
      className="modal-overlay"
      style={{
        display: 'flex',
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.7)',
        zIndex: 2000,
        alignItems: 'center',
        justifyContent: 'center',
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="perfil-card-detalle"
        style={{
          background: 'white',
          width: '90%',
          maxWidth: 500,
          borderRadius: 20,
          position: 'relative',
          maxHeight: '85vh',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <button
          type="button"
          onClick={onClose}
          style={{
            position: 'absolute',
            top: 15,
            right: 15,
            background: 'none',
            border: 'none',
            fontSize: '1.5rem',
            cursor: 'pointer',
            color: '#888',
            zIndex: 10,
          }}
          aria-label={t('closeProfile')}
        >
          &times;
        </button>

        <div className="perfil-scroll-content" style={{ padding: 30, overflowY: 'auto' }}>
          {loading ? (
            <p style={{ textAlign: 'center', color: '#666' }}>{t('loading')}</p>
          ) : loadError || !p ? (
            <div style={{ textAlign: 'center' }}>
              <p style={{ color: '#666', marginBottom: 16 }}>{t('profileLoadError')}</p>
              <button
                type="button"
                style={{
                  background: 'var(--primario-rosa)',
                  color: 'white',
                  border: 'none',
                  padding: '10px 20px',
                  borderRadius: 8,
                  cursor: 'pointer',
                  fontWeight: 600,
                }}
                onClick={onClose}
              >
                {t('closeProfile')}
              </button>
            </div>
          ) : (
            <>
              <header style={{ textAlign: 'center', marginBottom: 20 }}>
                <div
                  style={{
                    width: 100,
                    height: 100,
                    margin: '0 auto 10px',
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '2rem',
                    fontWeight: 'bold',
                    color: 'white',
                    backgroundColor: p.imagen_url ? 'transparent' : 'var(--primario-rosa)',
                    backgroundImage: p.imagen_url ? `url('${p.imagen_url}')` : undefined,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                    border: '3px solid white',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                  }}
                >
                  {p.imagen_url ? null : (p.nombre?.charAt(0).toUpperCase() || '?')}
                </div>
                <h2 style={{ margin: 0, color: 'var(--texto-oscuro)', fontSize: '1.5rem' }}>
                  {p.nombre}
                </h2>
                <p
                  style={{
                    color: 'var(--primario-rosa)',
                    fontWeight: 'bold',
                    marginTop: 5,
                    textTransform: 'uppercase',
                    fontSize: '0.9rem',
                    letterSpacing: 1,
                  }}
                >
                  {p.especialidad}
                </p>
                <div style={{ color: 'var(--acento-dorado)', marginTop: 5, fontWeight: 'bold' }}>
                  ⭐ {p.rating ?? '5.0'}
                </div>
              </header>

              <hr style={{ border: 0, borderTop: '1px solid #eee', margin: '20px 0' }} />

              <section style={{ marginBottom: 20 }}>
                <h3 style={{ fontSize: '1rem', color: 'var(--texto-oscuro)' }}>📜 {t('aboutMe')}</h3>
                <p style={{ fontSize: '0.9rem', color: '#666', lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>
                  {(p.biografia || t('bioFallback')).trim().replace(/\s{2,}/g, '\n\n')}
                </p>
              </section>

              <section style={{ marginBottom: 20 }}>
                <h3
                  style={{
                    fontSize: '1rem',
                    color: 'var(--texto-oscuro)',
                    textTransform: 'uppercase',
                    letterSpacing: 1,
                  }}
                >
                  🎯 {t('interventionAreas')}
                </h3>
                <ul
                  style={{
                    margin: '10px 0 0 0',
                    paddingLeft: '1.25rem',
                    color: 'var(--texto-oscuro)',
                    fontSize: '0.9rem',
                    lineHeight: 1.8,
                    listStyle: 'disc',
                  }}
                >
                  {(p.problemas_principales || []).length ? (
                    p.problemas_principales!.map((area) => <li key={area}>{area}</li>)
                  ) : (
                    <li style={{ listStyle: 'none', color: '#888' }}>{t('notSpecified')}</li>
                  )}
                </ul>
              </section>

              <section style={{ marginBottom: 20 }}>
                <h3
                  style={{
                    fontSize: '1rem',
                    color: 'var(--texto-oscuro)',
                    textTransform: 'uppercase',
                    letterSpacing: 1,
                  }}
                >
                  🩺 {t('services')}
                </h3>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 10 }}>
                  {(p.servicios || []).length ? (
                    p.servicios!.map((s) => (
                      <span key={s} className="tag-servicio">
                        {s}
                      </span>
                    ))
                  ) : (
                    <span style={{ color: '#888', fontSize: '0.9rem' }}>{t('noServices')}</span>
                  )}
                </div>
              </section>

              <section>
                <h3 style={{ fontSize: '1rem', color: 'var(--texto-oscuro)' }}>💬 {t('reviews')}</h3>
                <div
                  id="det-opiniones"
                  style={{
                    background: '#f9f9f9',
                    padding: 15,
                    borderRadius: 12,
                    fontSize: '0.85rem',
                    color: '#555',
                  }}
                >
                  {data?.opiniones?.length ? (
                    data.opiniones.map((o) => (
                      <div key={`${o.fecha}-${o.paciente_nombre}`} className="det-opinion-item">
                        <div className="det-opinion-meta">
                          <strong style={{ color: 'var(--texto-oscuro)' }}>
                            {initials(o.paciente_nombre)}
                          </strong>
                          <span className="det-opinion-estrellas">{stars(o.estrellas)}</span>
                          <span className="det-opinion-fecha">{formatDate(o.fecha)}</span>
                        </div>
                        <p className="det-opinion-comentario">{o.comentario}</p>
                      </div>
                    ))
                  ) : (
                    <p style={{ color: '#aaa', fontSize: '0.9rem', margin: 0 }}>{t('noReviews')}</p>
                  )}
                </div>
              </section>

              <button
                type="button"
                style={{
                  width: '100%',
                  background: 'var(--primario-rosa)',
                  color: 'white',
                  border: 'none',
                  padding: 15,
                  borderRadius: 12,
                  fontWeight: 'bold',
                  marginTop: 25,
                  cursor: 'pointer',
                }}
                onClick={() => {
                  onClose();
                  onAgendar(p);
                }}
              >
                {t('bookSessionNow')}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
