import Link from 'next/link';
import LegacyPage, { legacyMetadata } from '@/components/legacy/LegacyPage';
import { ensureDb, isResetTokenValid } from '@/lib/auth/service';

export const metadata = legacyMetadata('reestablecer-password');

function AuthNotice({
  title,
  body,
}: {
  title: string;
  body: string;
}) {
  return (
    <div
      style={{
        fontFamily: 'Arial, sans-serif',
        maxWidth: 500,
        margin: '50px auto',
        padding: 30,
        textAlign: 'center',
        background: '#f8d7da',
        borderRadius: 10,
      }}
    >
      <h2 style={{ color: '#721c24' }}>{title}</h2>
      <p style={{ color: '#721c24' }}>{body}</p>
      <Link href="/login" style={{ color: '#721c24' }}>
        Ir al login
      </Link>
    </div>
  );
}

export default async function ReestablecerPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;

  if (!token) {
    return (
      <AuthNotice
        title="❌ Enlace inválido"
        body="Falta el enlace de recuperación. Solicita uno nuevo desde el login."
      />
    );
  }

  if (!ensureDb()) {
    return (
      <AuthNotice
        title="Servicio no disponible"
        body="La base de datos aún no está configurada (ver MIGRATION.md §11b)."
      />
    );
  }

  const valid = await isResetTokenValid(token);
  if (!valid) {
    return (
      <AuthNotice
        title="❌ Enlace inválido o expirado"
        body="El enlace de recuperación no es válido o ya expiró (1 hora)."
      />
    );
  }

  return <LegacyPage view="reestablecer-password" />;
}
