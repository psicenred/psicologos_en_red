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

/** Lee la sesión desde el header Cookie (misma vía que el middleware). */
async function readSessionFromCookieHeader(cookieHeader: string) {
  const request = new Request('https://localhost', {
    headers: { cookie: cookieHeader },
  });
  return readSessionFromRequest(request);
}

export async function getSession(request?: Request) {
  if (request) {
    return readSessionFromRequest(request);
  }

  const options = getSessionOptions();
  const cookieName = options.cookieName ?? 'psic-en-red-session';

  const headerStore = await headers();
  const cookieHeader = headerStore.get('cookie');
  if (cookieHeader?.includes(cookieName)) {
    return readSessionFromCookieHeader(cookieHeader);
  }

  const cookieStore = await cookies();
  return getIronSession<SessionData>(cookieStore, options);
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
