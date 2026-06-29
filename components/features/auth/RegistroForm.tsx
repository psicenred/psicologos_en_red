'use client';

import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslations } from 'next-intl';
import { Link, useRouter } from '@/i18n/routing';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PhoneCountryInput } from '@/components/features/auth/PhoneCountryInput';
import { DEFAULT_PHONE_COUNTRY_DIAL } from '@/lib/phone/country-codes';
import { formatPhoneWithCountryCode } from '@/lib/phone/format';
import { registroSchema, type RegistroInput } from '@/lib/schemas/auth';
import { clearStoredReferralCode, getStoredReferralCode } from '@/lib/referral/client';

export function RegistroForm() {
  const t = useTranslations('auth');
  const [error, setError] = useState('');
  const router = useRouter();
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
        redirect: 'manual',
      });

      if (res.status >= 300 && res.status < 400) {
        clearStoredReferralCode();
        const location = res.headers.get('Location');
        const path = location
          ? new URL(location, window.location.origin).pathname
          : '/registro-exitoso';
        router.push(path);
        return;
      }

      const contentType = res.headers.get('content-type') || '';
      const payload = contentType.includes('application/json')
        ? ((await res.json().catch(() => null)) as {
            ok?: boolean;
            redirect?: string;
            code?: string;
            error?: string;
          } | null)
        : null;

      if (res.ok && payload?.ok && payload.redirect) {
        clearStoredReferralCode();
        router.push(payload.redirect);
        return;
      }

      if (payload?.code === 'EMAIL_EXISTS') {
        setError(t('emailAlreadyRegistered'));
        return;
      }
      if (payload?.code === 'PHONE_TOO_LONG') {
        setError(t('phoneTooLong'));
        return;
      }
      if (payload?.code === 'FIELD_TOO_LONG') {
        setError(payload.error || t('registerError'));
        return;
      }
      if (payload?.code === 'DB_UNAVAILABLE') {
        setError(t('dbUnavailable'));
        return;
      }
      if (payload?.code === 'SERVER_ERROR') {
        setError(payload.error || t('registerError'));
        return;
      }
      if (payload?.error) {
        setError(payload.error);
        return;
      }
      setError(t('registerError'));
    } catch {
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
        <Input id="password" type="password" {...register('password')} />
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
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      <Button type="submit" className="w-full" disabled={isSubmitting}>
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
