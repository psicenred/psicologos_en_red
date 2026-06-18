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

async function checkAuth(request: NextRequest): Promise<NextResponse | null> {
  const barePath = stripLocalePrefix(request.nextUrl.pathname);
  const response = NextResponse.next();
  const session = await getIronSession<SessionData>(
    request,
    response,
    getSessionOptions(),
  );

  if (!session.usuario) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('next', barePath);
    const status = request.method === 'POST' ? 303 : 307;
    return NextResponse.redirect(loginUrl, status);
  }

  const rol = normalizeRol(session.usuario.rol);

  if (barePath.startsWith('/panel-admin') && rol !== 'admin') {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  if (barePath.startsWith('/panel-doctor') && rol !== 'psicologo') {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  return null;
}

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  if (
    pathname.startsWith('/api') ||
    pathname.startsWith('/auth') ||
    pathname.startsWith('/_next') ||
    pathname === '/logout' ||
    pathname.startsWith('/registrar-usuario') ||
    pathname.startsWith('/verificar-email') ||
    pathname.startsWith('/reenviar-verificacion') ||
    /\.[^/]+$/.test(pathname)
  ) {
    return NextResponse.next();
  }

  if (isProtectedPath(pathname)) {
    const authRedirect = await checkAuth(request);
    if (authRedirect) return authRedirect;
  }

  return intlMiddleware(request);
}

export const config = {
  matcher: ['/', '/(en)/:path*', '/((?!api|auth|_next|_vercel|.*\\..*).*)'],
};
