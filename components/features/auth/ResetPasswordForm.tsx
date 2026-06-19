'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/routing';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { resetPasswordSchema, type ResetPasswordInput } from '@/lib/schemas/auth';

export function ResetPasswordForm({ token }: { token: string }) {
  const t = useTranslations('auth');
  const [msg, setMsg] = useState('');
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ResetPasswordInput>({ resolver: zodResolver(resetPasswordSchema) });

  async function onSubmit(data: ResetPasswordInput) {
    setMsg('');
    try {
      const res = await fetch('/auth/update-password-forgotten', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password: data.password }),
      });
      const json = await res.json();
      if (json.success) {
        setMsg(t('passwordUpdated'));
      } else {
        setMsg(json.error || t('connectionError'));
      }
    } catch {
      setMsg(t('connectionError'));
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div>
        <Label htmlFor="password">{t('newPassword')}</Label>
        <Input id="password" type="password" {...register('password')} />
        {errors.password ? (
          <p className="text-xs text-destructive">{errors.password.message}</p>
        ) : null}
      </div>
      <div>
        <Label htmlFor="confirm">{t('confirmPassword')}</Label>
        <Input id="confirm" type="password" {...register('confirm')} />
        {errors.confirm ? (
          <p className="text-xs text-destructive">{errors.confirm.message}</p>
        ) : null}
      </div>
      {msg ? <p className="text-sm text-muted-foreground">{msg}</p> : null}
      <Button type="submit" className="w-full" disabled={isSubmitting}>
        {isSubmitting ? t('saving') : t('savePassword')}
      </Button>
      <Link href="/login" className="block text-center text-sm text-primary">
        {t('goLogin')}
      </Link>
    </form>
  );
}
