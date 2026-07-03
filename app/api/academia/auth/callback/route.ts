import { NextResponse, type NextRequest } from 'next/server';
import { createAcademiaRouteHandlerClient } from '@/lib/academia/supabase/route-handler';

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  let next = searchParams.get('next') ?? '/cursos';

  if (!next.startsWith('/')) {
    next = '/cursos';
  }

  if (!code) {
    return NextResponse.redirect(`${origin}/academia/login?error=auth`);
  }

  const response = NextResponse.redirect(`${origin}${next}`);
  const supabase = createAcademiaRouteHandlerClient(request, response);
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    console.error('[academia/auth/callback]', error.message);
    return NextResponse.redirect(`${origin}/academia/login?error=auth`);
  }

  return response;
}
