'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';

const ASUNTO_KEYS = ['informacion', 'citas', 'pagos', 'soporte', 'profesionales', 'otro'] as const;

export function ContactoForm() {
  const t = useTranslations('contacto');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!success) return;
    const timer = window.setTimeout(() => setSuccess(false), 5000);
    return () => window.clearTimeout(timer);
  }, [success]);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(false);
    setSuccess(false);

    const form = new FormData(e.currentTarget);
    const payload = {
      nombre: String(form.get('nombre') ?? ''),
      email: String(form.get('email') ?? ''),
      telefono: String(form.get('telefono') ?? ''),
      asunto: String(form.get('asunto') ?? ''),
      mensaje: String(form.get('mensaje') ?? ''),
    };

    try {
      const res = await fetch('/api/contacto', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        setSuccess(true);
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
    <div className="contacto-form-card">
      <h2>{t('formTitle')}</h2>
      <p className="subtitulo">{t('formSubtitle')}</p>

      <div id="mensaje-exito" className={`mensaje-exito${success ? ' visible' : ''}`}>
        ✅ {t('successMessage')}
      </div>

      <form id="form-contacto" onSubmit={onSubmit}>
        <div className="form-row">
          <div className="form-group">
            <label htmlFor="nombre">{t('nameLabel')}</label>
            <input type="text" id="nombre" name="nombre" required placeholder={t('namePlaceholder')} />
          </div>
          <div className="form-group">
            <label htmlFor="email">{t('emailLabel')}</label>
            <input type="email" id="email" name="email" required placeholder={t('emailPlaceholder')} />
          </div>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label htmlFor="telefono">{t('phoneLabel')}</label>
            <input type="tel" id="telefono" name="telefono" placeholder={t('phonePlaceholder')} />
          </div>
          <div className="form-group">
            <label htmlFor="asunto">{t('subjectLabel')}</label>
            <select id="asunto" name="asunto" required defaultValue="">
              <option value="" disabled>
                {t('subjectPlaceholder')}
              </option>
              {ASUNTO_KEYS.map((key) => (
                <option key={key} value={key}>
                  {t(`subjects.${key}`)}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="form-group full-width">
          <label htmlFor="mensaje">{t('messageLabel')}</label>
          <textarea id="mensaje" name="mensaje" required placeholder={t('messagePlaceholder')} />
        </div>

        {error ? (
          <p style={{ color: '#c0392b', marginBottom: 12, fontSize: '0.9rem' }}>{t('submitError')}</p>
        ) : null}

        <button type="submit" className="btn-enviar-contacto" disabled={loading}>
          <span>{loading ? t('submitting') : t('submit')}</span>
          <span>📩</span>
        </button>
      </form>
    </div>
  );
}
