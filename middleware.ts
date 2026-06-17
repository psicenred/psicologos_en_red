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
    return NextResponse.redirect(loginUrl);
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
