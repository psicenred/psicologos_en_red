import type { Metadata } from 'next';
import { AuthLayout } from '@/components/layout/AuthLayout';
import { LoginForm } from '@/components/features/auth/LoginForm';

export const metadata: Metadata = { title: 'Iniciar Sesión' };

export default function LoginPage() {
  return (
    <AuthLayout title="Bienvenido de nuevo" subtitle="Ingresa a tu consultorio virtual">
      <LoginForm />
    </AuthLayout>
  );
}
