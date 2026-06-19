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

/** Rutas donde pudo quedar una cookie legacy con Path distinto de `/`. */
const LEGACY_SESSION_PATHS = [
  '/',
  '/panel-doctor',
  '/panel-admin',
  '/perfil',
  '/api',
  '/api/auth',
  '/api/auth/login',
  '/api/admin',
  '/api/admin/citas',
];

export function clearLegacySessionCookies(response: NextResponse) {
  const options = getSessionOptions();
  const name = options.cookieName ?? 'psic-en-red-session';
  for (const path of LEGACY_SESSION_PATHS) {
    response.cookies.set(name, '', {
      ...options.cookieOptions,
      path,
      maxAge: 0,
    });
  }
}

async function clearLegacySessionCookiesFromStore() {
  const options = getSessionOptions();
  const name = options.cookieName ?? 'psic-en-red-session';
  const cookieStore = await cookies();
  for (const path of LEGACY_SESSION_PATHS) {
    cookieStore.set(name, '', { ...options.cookieOptions, path, maxAge: 0 });
  }
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
  const options = getSessionOptions();
  const cookieName = options.cookieName ?? 'psic-en-red-session';

  // Patrón recomendado por iron-session en App Router: cookies() primero.
  const cookieStore = await cookies();
  const fromStore = await getIronSession<SessionData>(cookieStore, options);
  if (fromStore.usuario) return fromStore;

  const headerStore = await headers();
  const cookieHeader = headerStore.get('cookie');
  if (cookieHeader?.includes(cookieName)) {
    const fromHeaders = await readSessionFromCookieHeader(cookieHeader);
    if (fromHeaders.usuario) return fromHeaders;
  }

  if (request) {
    return readSessionFromRequest(request);
  }

  return fromStore;
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
  clearLegacySessionCookies(response);
  const session = await getIronSession<SessionData>(request, response, getSessionOptions());
  session.usuario = usuario;
  await session.save();
}

export async function destroySessionOnResponse(request: Request, response: NextResponse) {
  clearLegacySessionCookies(response);
  const session = await getIronSession<SessionData>(request, response, getSessionOptions());
  session.destroy();
}

export async function setSessionUsuario(usuario: SessionUsuario) {
  await clearLegacySessionCookiesFromStore();
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
  await clearLegacySessionCookiesFromStore();
  const session = await getSession();
  session.destroy();
}
