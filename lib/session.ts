import { getIronSession, type SessionOptions } from 'iron-session';
import { cookies, headers } from 'next/headers';
import { NextResponse } from 'next/server';

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
      path: '/',
    },
  };
}

async function readSessionFromRequest(request: Request) {
  return getIronSession<SessionData>(request, new NextResponse(), getSessionOptions());
}

export async function getSession() {
  const options = getSessionOptions();
  const cookieStore = await cookies();
  const session = await getIronSession<SessionData>(cookieStore, options);
  if (session.usuario) return session;

  const headerStore = await headers();
  const cookieHeader = headerStore.get('cookie');
  if (!cookieHeader) return session;

  const request = new Request('https://psicologosenred.local', {
    headers: { cookie: cookieHeader },
  });
  return readSessionFromRequest(request);
}

export async function getSessionFromRequest(request: Request) {
  return readSessionFromRequest(request);
}

/** Guarda la sesión en la misma respuesta que se devuelve al cliente (login/logout). */
export async function saveSessionOnResponse(
  request: Request,
  response: NextResponse,
  usuario: SessionUsuario,
) {
  const session = await getIronSession<SessionData>(request, response, getSessionOptions());
  session.usuario = usuario;
  await session.save();
}

export async function destroySessionOnResponse(request: Request, response: NextResponse) {
  const session = await getIronSession<SessionData>(request, response, getSessionOptions());
  session.destroy();
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
