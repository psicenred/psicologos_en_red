import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getIronSession } from 'iron-session';
import {
  getSessionOptions,
  type SessionData,
} from '@/lib/session';

function normalizeRol(rol: string | undefined): string {
  return (rol || '').trim().toLowerCase();
}

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const response = NextResponse.next();
  const session = await getIronSession<SessionData>(
    request,
    response,
    getSessionOptions(),
  );

  if (!session.usuario) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('next', pathname);
    // 303 si llegó un POST (p. ej. redirect 307 tras login); 307 basta para GET.
    const status = request.method === 'POST' ? 303 : 307;
    return NextResponse.redirect(loginUrl, status);
  }

  const rol = normalizeRol(session.usuario.rol);

  if (pathname.startsWith('/panel-admin') && rol !== 'admin') {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  if (pathname.startsWith('/panel-doctor') && rol !== 'psicologo') {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  return response;
}

export const config = {
  matcher: ['/perfil/:path*', '/panel-admin', '/panel-doctor'],
};
