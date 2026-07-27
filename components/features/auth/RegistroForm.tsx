'use client';

import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useLocale, useTranslations } from 'next-intl';
import { Link } from '@/i18n/routing';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PasswordInput } from '@/components/features/auth/PasswordInput';
import { Label } from '@/components/ui/label';
import { PhoneCountryInput } from '@/components/features/auth/PhoneCountryInput';
import {
  resetTurnstileWidgets,
  TurnstileWidget,
} from '@/components/features/auth/TurnstileWidget';
import { DEFAULT_PHONE_COUNTRY_DIAL } from '@/lib/phone/country-codes';
import { formatPhoneWithCountryCode } from '@/lib/phone/format';
import { registroSchema, type RegistroInput } from '@/lib/schemas/auth';
import { clearStoredReferralCode, getStoredReferralCode } from '@/lib/referral/client';
import {
  interpretRegistroResponse,
  navigateAfterRegistroSuccess,
  parseRegistroPayload,
} from '@/lib/auth/registro-response';

const TURNSTILE_SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY?.trim() || '';

export function RegistroForm() {
  const t = useTranslations('auth');
  const locale = useLocale();
  const [error, setError] = useState('');
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const {
    register,
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RegistroInput>({
    resolver: zodResolver(registroSchema),
    defaultValues: {
      codigo_pais: DEFAULT_PHONE_COUNTRY_DIAL,
      telefono_numero: '',
      acepto_publicidad: false,
    },
  });

  async function onSubmit(data: RegistroInput) {
    setError('');

    if (TURNSTILE_SITE_KEY && !captchaToken) {
      setError(t('captchaRequired'));
      return;
    }

    const telefono = formatPhoneWithCountryCode(
      data.codigo_pais || DEFAULT_PHONE_COUNTRY_DIAL,
      data.telefono_numero ?? '',
    );
    const params: Record<string, string> = {
      nombre: data.nombre,
      email: data.email,
      password: data.password,
      telefono,
      rol: 'paciente',
      acepto_terminos: 'on',
    };
    if (data.acepto_publicidad) {
      params.acepto_publicidad = 'on';
    }
    if (captchaToken) {
      params.cf_turnstile_response = captchaToken;
    }
    const refCode = getStoredReferralCode();
    if (refCode) {
      params.ref_code = refCode;
    }

    try {
      const res = await fetch('/registrar-usuario', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          Accept: 'application/json',
        },
        body: new URLSearchParams(params),
      });

      const payload = await parseRegistroPayload(res);
      const result = interpretRegistroResponse({
        status: res.status,
        redirected: res.redirected,
        url: res.url,
        type: res.type,
        payload,
      });

      if (result.kind === 'success') {
        clearStoredReferralCode();
        navigateAfterRegistroSuccess(result.redirect, data.email);
        return;
      }

      setCaptchaToken(null);
      resetTurnstileWidgets();

      if (result.code === 'EMAIL_EXISTS') {
        setError(t('emailAlreadyRegistered'));
        return;
      }
      if (result.code === 'PHONE_TOO_LONG') {
        setError(t('phoneTooLong'));
        return;
      }
      if (result.code === 'FIELD_TOO_LONG') {
        setError(result.message || t('registerError'));
        return;
      }
      if (result.code === 'DB_UNAVAILABLE') {
        setError(t('dbUnavailable'));
        return;
      }
      if (result.code === 'CAPTCHA_FAILED') {
        setError(result.message || t('captchaFailed'));
        return;
      }
      if (result.code === 'RATE_LIMITED') {
        setError(result.message || t('rateLimited'));
        return;
      }
      if (result.code === 'SERVER_ERROR') {
        setError(result.message || t('registerError'));
        return;
      }
      if (result.message) {
        setError(result.message);
        return;
      }
      setError(t('registerError'));
    } catch {
      setCaptchaToken(null);
      resetTurnstileWidgets();
      setError(t('connectionError'));
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div>
        <Label htmlFor="nombre">{t('name')}</Label>
        <Input id="nombre" {...register('nombre')} />
        {errors.nombre ? <p className="text-xs text-destructive">{errors.nombre.message}</p> : null}
      </div>
      <div>
        <Label htmlFor="email">{t('email')}</Label>
        <Input id="email" type="email" {...register('email')} />
        {errors.email ? <p className="text-xs text-destructive">{errors.email.message}</p> : null}
      </div>
      <div>
        <Label htmlFor="telefono_numero">{t('phone')}</Label>
        <Controller
          control={control}
          name="codigo_pais"
          render={({ field: countryField }) => (
            <Controller
              control={control}
              name="telefono_numero"
              render={({ field: numberField }) => (
                <PhoneCountryInput
                  countryDial={countryField.value ?? DEFAULT_PHONE_COUNTRY_DIAL}
                  localNumber={numberField.value ?? ''}
                  onCountryDialChange={countryField.onChange}
                  onLocalNumberChange={numberField.onChange}
                  countryLabel={t('phoneCountryCode')}
                  numberPlaceholder={t('phoneLocalPlaceholder')}
                  countryError={errors.codigo_pais?.message}
                  numberError={errors.telefono_numero?.message}
                />
              )}
            />
          )}
        />
      </div>
      <div>
        <Label htmlFor="password">{t('password')}</Label>
        <PasswordInput id="password" autoComplete="new-password" {...register('password')} />
        {errors.password ? (
          <p className="text-xs text-destructive">{errors.password.message}</p>
        ) : null}
      </div>
      <label className="flex items-start gap-2 text-sm">
        <input type="checkbox" className="mt-1" {...register('acepto_terminos')} />
        <span>
          {t('acceptTerms')}{' '}
          <Link href="/terminos-condiciones" className="text-primary underline">
            {t('termsLink')}
          </Link>
        </span>
      </label>
      {errors.acepto_terminos ? (
        <p className="text-xs text-destructive">{errors.acepto_terminos.message}</p>
      ) : null}
      <label className="flex items-start gap-2 text-sm">
        <input type="checkbox" className="mt-1" {...register('acepto_publicidad')} />
        <span>{t('acceptMarketing')}</span>
      </label>
      {TURNSTILE_SITE_KEY ? (
        <TurnstileWidget
          siteKey={TURNSTILE_SITE_KEY}
          onToken={setCaptchaToken}
          language={locale.startsWith('en') ? 'en' : 'es'}
        />
      ) : null}
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      <Button
        type="submit"
        className="w-full"
        disabled={isSubmitting || (Boolean(TURNSTILE_SITE_KEY) && !captchaToken)}
      >
        {isSubmitting ? t('registering') : t('register')}
      </Button>
      <p className="text-center text-sm">
        {t('hasAccount')}{' '}
        <Link href="/login" className="font-medium text-primary">
          {t('signIn')}
        </Link>
      </p>
    </form>
  );
}
