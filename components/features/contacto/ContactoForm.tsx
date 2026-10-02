'use client';

import { useEffect, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import {
  resetTurnstileWidgets,
  TurnstileWidget,
} from '@/components/features/auth/TurnstileWidget';
import { FormHoneypot } from '@/components/features/public/FormHoneypot';
import { HONEYPOT_FIELD_NAME } from '@/lib/security/honeypot';

const ASUNTO_KEYS = ['informacion', 'citas', 'pagos', 'soporte', 'profesionales', 'otro'] as const;
const TURNSTILE_SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY?.trim() || '';

export function ContactoForm() {
  const t = useTranslations('contacto');
  const locale = useLocale();
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);

  useEffect(() => {
    if (!success) return;
    const timer = window.setTimeout(() => setSuccess(false), 5000);
    return () => window.clearTimeout(timer);
  }, [success]);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(false);

    if (TURNSTILE_SITE_KEY && !captchaToken) {
      setError(t('captchaRequired'));
      setLoading(false);
      return;
    }

    const formEl = e.currentTarget;
    const form = new FormData(formEl);
    const payload: Record<string, string> = {
      nombre: String(form.get('nombre') ?? ''),
      email: String(form.get('email') ?? ''),
      telefono: String(form.get('telefono') ?? ''),
      asunto: String(form.get('asunto') ?? ''),
      mensaje: String(form.get('mensaje') ?? ''),
      [HONEYPOT_FIELD_NAME]: String(form.get(HONEYPOT_FIELD_NAME) ?? ''),
    };
    if (captchaToken) {
      payload.cf_turnstile_response = captchaToken;
    }

    try {
      const res = await fetch('/api/contacto', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = (await res.json().catch(() => ({}))) as {
        error?: string;
        code?: string;
      };

      if (res.ok) {
        setSuccess(true);
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
    <div className="contacto-form-card">
      <h2>{t('formTitle')}</h2>
      <p className="subtitulo">{t('formSubtitle')}</p>

      <div id="mensaje-exito" className={`mensaje-exito${success ? ' visible' : ''}`}>
        ✅ {t('successMessage')}
      </div>

      <form id="form-contacto" onSubmit={onSubmit} style={{ position: 'relative' }}>
        <FormHoneypot />
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
          <p style={{ color: '#c0392b', marginBottom: 12, fontSize: '0.9rem' }}>{error}</p>
        ) : null}

        <button
          type="submit"
          className="btn-enviar-contacto"
          disabled={loading || (Boolean(TURNSTILE_SITE_KEY) && !captchaToken)}
        >
          <span>{loading ? t('submitting') : t('submit')}</span>
          <span>📩</span>
        </button>
      </form>
    </div>
  );
}
