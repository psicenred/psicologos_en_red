import createIntlMiddleware from 'next-intl/middleware';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getIronSession } from 'iron-session';
import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { routing, stripLocalePrefix } from '@/i18n/routing';
import { getSessionOptions, type SessionData } from '@/lib/session';
import { getSupabaseAnonKey, getSupabaseUrl } from '@/lib/academia/supabase/env';
import { updateAcademiaSession } from '@/lib/academia/supabase/middleware';

const intlMiddleware = createIntlMiddleware(routing);

function normalizeRol(rol: string | undefined): string {
  return (rol || '').trim().toLowerCase();
}

const PROTECTED_PREFIXES = ['/perfil', '/panel-admin', '/panel-doctor'];
const CURSO_PROTECTED_PREFIX = '/cursos';

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

  const barePath = stripLocalePrefix(pathname);

  if (barePath === CURSO_PROTECTED_PREFIX || barePath.startsWith(`${CURSO_PROTECTED_PREFIX}/`)) {
    if (barePath !== '/cursos' && !barePath.startsWith('/cursos/alumno') && !barePath.startsWith('/cursos/instructor') && !barePath.startsWith('/cursos/admin')) {
      return response;
    }

    if (!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() || !process.env.NEXT_PUBLIC_SUPABASE_URL?.trim()) {
      const loginUrl = new URL('/academia/login', request.url);
      loginUrl.searchParams.set('next', barePath);
      return NextResponse.redirect(loginUrl, 307);
    }

    const academiaResponse = response;
    await updateAcademiaSession(request, academiaResponse);

    const supabase = createServerClient(getSupabaseUrl(), getSupabaseAnonKey(), {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
          cookiesToSet.forEach(({ name, value, options }) => {
            academiaResponse.cookies.set(name, value, options);
          });
        },
      },
    });

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      const loginUrl = new URL('/academia/login', request.url);
      loginUrl.searchParams.set('next', barePath);
      return NextResponse.redirect(loginUrl, 307);
    }

    const role =
      (user.user_metadata?.academia_role as string | undefined) ??
      (await resolveAcademiaRoleInMiddleware(supabase, user.id));

    if (barePath.startsWith('/cursos/alumno') && role !== 'student') {
      if (role === 'instructor') {
        return NextResponse.redirect(new URL('/cursos/instructor', request.url));
      }
      if (role === 'admin') {
        return NextResponse.redirect(new URL('/cursos/admin', request.url));
      }
      const loginUrl = new URL('/academia/login', request.url);
      loginUrl.searchParams.set('next', barePath);
      return NextResponse.redirect(loginUrl, 307);
    }

    if (barePath.startsWith('/cursos/instructor') && role !== 'instructor') {
      if (role === 'student') {
        return NextResponse.redirect(new URL('/cursos/alumno', request.url));
      }
      if (role === 'admin') {
        return NextResponse.redirect(new URL('/cursos/admin', request.url));
      }
      const loginUrl = new URL('/academia/login', request.url);
      loginUrl.searchParams.set('next', barePath);
      return NextResponse.redirect(loginUrl, 307);
    }

    if (barePath.startsWith('/cursos/admin') && role !== 'admin') {
      if (role === 'instructor') {
        return NextResponse.redirect(new URL('/cursos/instructor', request.url));
      }
      if (role === 'student') {
        return NextResponse.redirect(new URL('/cursos/alumno', request.url));
      }
      const loginUrl = new URL('/academia/login', request.url);
      loginUrl.searchParams.set('next', barePath);
      return NextResponse.redirect(loginUrl, 307);
    }

    return academiaResponse;
  }

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

async function resolveAcademiaRoleInMiddleware(
  supabase: ReturnType<typeof createServerClient>,
  userId: string,
): Promise<'student' | 'instructor' | 'admin' | null> {
  const { data: admin } = await supabase
    .from('course_admin_profiles')
    .select('id')
    .eq('id', userId)
    .maybeSingle();
  if (admin) return 'admin';

  const { data: student } = await supabase
    .from('course_student_profiles')
    .select('id')
    .eq('id', userId)
    .maybeSingle();
  if (student) return 'student';

  const { data: instructor } = await supabase
    .from('course_instructor_profiles')
    .select('id')
    .eq('id', userId)
    .maybeSingle();
  if (instructor) return 'instructor';

  return null;
}

export const config = {
  matcher: ['/', '/(en)/:path*', '/((?!api|auth|_next|_vercel|.*\\..*).*)'],
};
