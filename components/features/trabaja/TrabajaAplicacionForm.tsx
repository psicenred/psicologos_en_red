'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';

const PAISES = [
  'México',
  'Argentina',
  'Colombia',
  'Chile',
  'Perú',
  'España',
  'Ecuador',
  'Venezuela',
  'Guatemala',
  'Costa Rica',
  'Otro',
] as const;

export function TrabajaAplicacionForm() {
  const t = useTranslations('trabaja');
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [error, setError] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(false);

    const form = new FormData(e.currentTarget);
    const payload = {
      nombre: String(form.get('nombre') ?? ''),
      telefono: String(form.get('telefono') ?? ''),
      email: String(form.get('email') ?? ''),
      pais: String(form.get('pais') ?? ''),
      razones: String(form.get('razones') ?? ''),
      experiencia: String(form.get('experiencia') ?? ''),
    };

    try {
      const res = await fetch('/api/aplicacion-trabajo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        setModalOpen(true);
        e.currentTarget.reset();
      } else {
        setError(true);
      }
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <div className="trabaja-form-card">
        <h2>{t('formTitle')}</h2>
        <p className="subtitulo">{t('formSubtitle')}</p>

        <form id="form-aplicacion" onSubmit={onSubmit}>
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="nombre">{t('nameLabel')}</label>
              <input
                type="text"
                id="nombre"
                name="nombre"
                required
                placeholder={t('namePlaceholder')}
              />
            </div>
            <div className="form-group">
              <label htmlFor="telefono">{t('phoneLabel')}</label>
              <input
                type="tel"
                id="telefono"
                name="telefono"
                required
                placeholder={t('phonePlaceholder')}
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="email">{t('emailLabel')}</label>
              <input
                type="email"
                id="email"
                name="email"
                required
                placeholder={t('emailPlaceholder')}
              />
            </div>
            <div className="form-group">
              <label htmlFor="pais">{t('countryLabel')}</label>
              <select id="pais" name="pais" required defaultValue="">
                <option value="" disabled>
                  {t('countryPlaceholder')}
                </option>
                {PAISES.map((pais) => (
                  <option key={pais} value={pais}>
                    {pais}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="form-group full-width">
            <label htmlFor="razones">{t('reasonsLabel')}</label>
            <textarea
              id="razones"
              name="razones"
              required
              placeholder={t('reasonsPlaceholder')}
            />
          </div>

          <div className="form-group full-width">
            <label htmlFor="experiencia">{t('experienceLabel')}</label>
            <textarea
              id="experiencia"
              name="experiencia"
              required
              placeholder={t('experiencePlaceholder')}
            />
          </div>

          {error ? (
            <p style={{ color: '#c0392b', marginBottom: 12, fontSize: '0.9rem' }}>
              {t('submitError')}
            </p>
          ) : null}

          <button type="submit" className="btn-enviar-aplicacion" disabled={loading}>
            <span>{loading ? t('submitting') : t('submit')}</span>
            <span>📨</span>
          </button>
        </form>
      </div>

      <div
        id="modal-exito"
        className={`modal-exito-overlay${modalOpen ? ' visible' : ''}`}
        onClick={(e) => {
          if (e.target === e.currentTarget) setModalOpen(false);
        }}
      >
        <div className="modal-exito-content">
          <div className="modal-exito-icon">🎉</div>
          <h3>{t('successTitle')}</h3>
          <p>{t('successMessage')}</p>
          <button type="button" className="btn-cerrar-modal" onClick={() => setModalOpen(false)}>
            {t('successClose')}
          </button>
        </div>
      </div>
    </>
  );
}
