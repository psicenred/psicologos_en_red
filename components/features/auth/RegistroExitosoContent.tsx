'use client';

import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/routing';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ResendVerificationForm } from '@/components/features/auth/ResendVerificationForm';

type RegistroExitosoContentProps = {
  initialEmail?: string;
};

export function RegistroExitosoContent({ initialEmail = '' }: RegistroExitosoContentProps) {
  const t = useTranslations('auth');

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-purple-50 to-blue-50 p-4">
      <Card className="max-w-lg text-center">
        <CardContent className="space-y-4 p-8">
          <div className="text-6xl">📧</div>
          <h1 className="text-2xl font-bold">{t('registerSuccessTitle')}</h1>
          <p className="text-muted-foreground">{t('registerSuccessBody')}</p>
          <div className="rounded-xl bg-primary/10 p-4 text-sm">
            <strong>{t('registerSuccessCheckInbox')}</strong>
          </div>
          <ol className="list-decimal space-y-2 pl-6 text-left text-sm text-muted-foreground">
            <li>{t('registerSuccessStep1')}</li>
            <li>{t('registerSuccessStep2')}</li>
            <li>{t('registerSuccessStep3')}</li>
            <li>{t('registerSuccessStep4')}</li>
          </ol>
          <Button asChild className="rounded-full">
            <Link href="/login">{t('goLogin')}</Link>
          </Button>

          <div className="rounded-xl border border-dashed border-primary/30 bg-muted/30 p-4 text-left">
            <p className="mb-3 text-sm font-medium">{t('verificationResendPrompt')}</p>
            <ResendVerificationForm defaultEmail={initialEmail} compact />
            <p className="mt-3 text-center text-xs text-muted-foreground">
              <Link
                href={
                  initialEmail
                    ? `/reenviar-verificacion?email=${encodeURIComponent(initialEmail)}`
                    : '/reenviar-verificacion'
                }
                className="text-primary underline"
              >
                {t('verificationResendOpenPage')}
              </Link>
            </p>
          </div>

          <p className="text-xs text-muted-foreground">{t('registerSuccessSpamHint')}</p>
        </CardContent>
      </Card>
    </div>
  );
}
