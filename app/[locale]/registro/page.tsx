import type { Metadata } from 'next';
import { Suspense } from 'react';
import { AuthLayout } from '@/components/layout/AuthLayout';
import { RegistroForm } from '@/components/features/auth/RegistroForm';
import { ReferralRefCapture } from '@/components/features/auth/ReferralRefCapture';

export const metadata: Metadata = { title: 'Crear Cuenta' };

export default function RegistroPage() {
  return (
    <AuthLayout title="Únete a nuestra Red" subtitle="Crea tu cuenta y comienza tu camino al bienestar">
      <Suspense fallback={null}>
        <ReferralRefCapture />
      </Suspense>
      <RegistroForm />
    </AuthLayout>
  );
}
