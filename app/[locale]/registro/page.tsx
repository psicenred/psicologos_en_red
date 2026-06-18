import type { Metadata } from 'next';
import { AuthLayout } from '@/components/layout/AuthLayout';
import { RegistroForm } from '@/components/features/auth/RegistroForm';

export const metadata: Metadata = { title: 'Crear Cuenta' };

export default function RegistroPage() {
  return (
    <AuthLayout title="Únete a nuestra Red" subtitle="Crea tu cuenta y comienza tu camino al bienestar">
      <RegistroForm />
    </AuthLayout>
  );
}
