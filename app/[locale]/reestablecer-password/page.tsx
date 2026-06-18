import Link from 'next/link';
import { AuthLayout } from '@/components/layout/AuthLayout';
import { ResetPasswordForm } from '@/components/features/auth/ResetPasswordForm';
import { ensureDb, isResetTokenValid } from '@/lib/auth/service';

export default async function ReestablecerPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;

  if (!token) {
    return (
      <AuthLayout title="Enlace inválido" subtitle="Solicita uno nuevo desde el login">
        <Link href="/login" className="text-center text-primary">
          Ir al login
        </Link>
      </AuthLayout>
    );
  }

  if (!ensureDb()) {
    return (
      <AuthLayout title="Servicio no disponible" subtitle="Base de datos no configurada">
        <Link href="/">Volver al inicio</Link>
      </AuthLayout>
    );
  }

  const valid = await isResetTokenValid(token);
  if (!valid) {
    return (
      <AuthLayout title="Enlace expirado" subtitle="El enlace no es válido o ya expiró">
        <Link href="/login" className="text-primary">
          Ir al login
        </Link>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout title="Nueva contraseña" subtitle="Elige una contraseña segura">
      <ResetPasswordForm token={token} />
    </AuthLayout>
  );
}
