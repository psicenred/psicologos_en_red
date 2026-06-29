import createIntlMiddleware from 'next-intl/middleware';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getIronSession } from 'iron-session';
import { routing, stripLocalePrefix } from '@/i18n/routing';
import { getSessionOptions, type SessionData } from '@/lib/session';

const intlMiddleware = createIntlMiddleware(routing);

function normalizeRol(rol: string | undefined): string {
  return (rol || '').trim().toLowerCase();
}

const PROTECTED_PREFIXES = ['/perfil', '/panel-admin', '/panel-doctor'];

function isProtectedPath(pathname: string): boolean {
  const bare = stripLocalePrefix(pathname);
  return PROTECTED_PREFIXES.some(
    (p) => bare === p || bare.startsWith(`${p}/`),
  );
}

function shouldSkipMiddleware(pathname: string): boolean {
  return (
    pathname.startsWith('/api') ||
    pathname.startsWith('/auth') ||
    pathname.startsWith('/webhook') ||
    pathname.startsWith('/_next') ||
    pathname === '/logout' ||
    pathname.startsWith('/registrar-usuario') ||
    pathname.startsWith('/verificar-email') ||
    /\.[^/]+$/.test(pathname)
  );
}

/** POST de Server Actions: no redirigir ni reescribir cookies (rompe la respuesta). */
function isServerActionRequest(request: NextRequest): boolean {
  return request.headers.has('next-action');
}

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  if (shouldSkipMiddleware(pathname)) {
    return NextResponse.next();
  }

  const intlResponse = intlMiddleware(request);
  const response = intlResponse ?? NextResponse.next();

  if (isServerActionRequest(request)) {
    return response;
  }

  const session = await getIronSession<SessionData>(
    request,
    response,
    getSessionOptions(),
  );

  if (isProtectedPath(pathname)) {
    const barePath = stripLocalePrefix(pathname);

    if (!session.usuario) {
      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('next', barePath);
      return NextResponse.redirect(loginUrl, 307);
    }

    const rol = normalizeRol(session.usuario.rol);

    if (barePath === '/perfil' || barePath.startsWith('/perfil/')) {
      if (rol === 'admin') {
        return NextResponse.redirect(new URL('/panel-admin', request.url));
      }
      if (rol === 'psicologo') {
        return NextResponse.redirect(new URL('/panel-doctor', request.url));
      }
    }

    if (barePath.startsWith('/panel-admin') && rol !== 'admin') {
      return NextResponse.redirect(new URL('/login', request.url));
    }

    if (barePath.startsWith('/panel-doctor') && rol !== 'psicologo') {
      return NextResponse.redirect(new URL('/login', request.url));
    }
  }

  // Re-emite la cookie con Path=/ en cada navegación autenticada para que
  // los fetch a /api/* también reciban psic-en-red-session.
  if (session.usuario) {
    await session.save();
  }

  return response;
}

export const config = {
  matcher: ['/', '/(en)/:path*', '/((?!api|auth|_next|_vercel|.*\\..*).*)'],
};
