import { getIronSession, type SessionOptions } from 'iron-session';
import { cookies } from 'next/headers';

export interface SessionUsuario {
  id: number;
  nombre: string;
  email: string;
  rol: string;
}

export interface SessionData {
  usuario?: SessionUsuario;
}

const DEV_FALLBACK_SECRET = 'dev-only-insecure-session-secret-min-32-chars!!';

function getSessionPassword(): string {
  const secret = process.env.SESSION_SECRET?.trim();

  if (secret && secret.length >= 32) {
    return secret;
  }

  if (process.env.NODE_ENV === 'production') {
    throw new Error(
      'SESSION_SECRET debe estar definida y tener al menos 32 caracteres en producción.',
    );
  }

  console.warn(
    '[session] SESSION_SECRET no definida o demasiado corta; usando fallback solo para desarrollo.',
  );
  return DEV_FALLBACK_SECRET;
}

export function getSessionOptions(): SessionOptions {
  const isProduction = process.env.NODE_ENV === 'production';

  return {
    password: getSessionPassword(),
    cookieName: 'psic-en-red-session',
    cookieOptions: {
      secure: isProduction,
      sameSite: 'lax',
      httpOnly: true,
    },
  };
}

export async function getSession() {
  return getIronSession<SessionData>(await cookies(), getSessionOptions());
}

export async function setSessionUsuario(usuario: SessionUsuario) {
  const session = await getSession();
  session.usuario = usuario;
  await session.save();
}

export async function updateSessionNombre(nombre: string) {
  const session = await getSession();
  if (session.usuario) {
    session.usuario = { ...session.usuario, nombre };
    await session.save();
  }
}

export async function destroySession() {
  const session = await getSession();
  session.destroy();
}
