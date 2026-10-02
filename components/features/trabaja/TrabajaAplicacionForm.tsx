'use client';

import { useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import {
  resetTurnstileWidgets,
  TurnstileWidget,
} from '@/components/features/auth/TurnstileWidget';
import { FormHoneypot } from '@/components/features/public/FormHoneypot';
import { HONEYPOT_FIELD_NAME } from '@/lib/security/honeypot';

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

const TURNSTILE_SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY?.trim() || '';

export function TrabajaAplicacionForm() {
  const t = useTranslations('trabaja');
  const locale = useLocale();
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    if (TURNSTILE_SITE_KEY && !captchaToken) {
      setError(t('captchaRequired'));
      setLoading(false);
      return;
    }

    const formEl = e.currentTarget;
    const form = new FormData(formEl);
    const payload: Record<string, string> = {
      nombre: String(form.get('nombre') ?? ''),
      telefono: String(form.get('telefono') ?? ''),
      email: String(form.get('email') ?? ''),
      pais: String(form.get('pais') ?? ''),
      razones: String(form.get('razones') ?? ''),
      experiencia: String(form.get('experiencia') ?? ''),
      [HONEYPOT_FIELD_NAME]: String(form.get(HONEYPOT_FIELD_NAME) ?? ''),
    };
    if (captchaToken) {
      payload.cf_turnstile_response = captchaToken;
    }

    try {
      const res = await fetch('/api/aplicacion-trabajo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = (await res.json().catch(() => ({}))) as {
        error?: string;
        code?: string;
      };

      if (res.ok) {
        setModalOpen(true);
        formEl.reset();
        setCaptchaToken(null);
        resetTurnstileWidgets();
      } else if (res.status === 429 || data.code === 'RATE_LIMITED') {
        setError(t('rateLimited'));
        setCaptchaToken(null);
        resetTurnstileWidgets();
      } else if (data.code === 'CAPTCHA_FAILED') {
        setError(t('captchaFailed'));
        setCaptchaToken(null);
        resetTurnstileWidgets();
      } else {
        setError(t('submitError'));
        setCaptchaToken(null);
        resetTurnstileWidgets();
      }
    } catch {
      setError(t('submitError'));
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <div className="trabaja-form-card">
        <h2>{t('formTitle')}</h2>
        <p className="subtitulo">{t('formSubtitle')}</p>

        <form id="form-aplicacion" onSubmit={onSubmit} style={{ position: 'relative' }}>
          <FormHoneypot />
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

          {TURNSTILE_SITE_KEY ? (
            <div style={{ margin: '16px 0' }}>
              <TurnstileWidget
                siteKey={TURNSTILE_SITE_KEY}
                onToken={setCaptchaToken}
                language={locale.startsWith('en') ? 'en' : 'es'}
                appearance="interaction-only"
              />
            </div>
          ) : null}

          {error ? (
            <p style={{ color: '#c0392b', marginBottom: 12, fontSize: '0.9rem' }}>
              {error}
            </p>
          ) : null}

          <button
            type="submit"
            className="btn-enviar-aplicacion"
            disabled={loading || (Boolean(TURNSTILE_SITE_KEY) && !captchaToken)}
          >
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
