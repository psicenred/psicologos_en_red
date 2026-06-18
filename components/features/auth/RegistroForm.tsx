'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/routing';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { registroSchema, type RegistroInput } from '@/lib/schemas/auth';

export function RegistroForm() {
  const t = useTranslations('auth');
  const [error, setError] = useState('');
  const router = useRouter();
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RegistroInput>({ resolver: zodResolver(registroSchema) });

  async function onSubmit(data: RegistroInput) {
    setError('');
    try {
      const res = await fetch('/registrar-usuario', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          nombre: data.nombre,
          email: data.email,
          password: data.password,
          telefono: data.telefono || '',
          rol: 'paciente',
          acepto_terminos: 'on',
        }),
        redirect: 'manual',
      });
      if (res.status >= 300 && res.status < 400) {
        router.push('/registro-exitoso');
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
        <Label htmlFor="telefono">{t('phone')}</Label>
        <Input id="telefono" type="tel" {...register('telefono')} />
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
