import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { academiaDashboardPath, getAcademiaSession } from '@/lib/academia/auth';
import { createAcademiaServerClient } from '@/lib/academia/supabase/server';

/**
 * Valida la sesión de academia ya establecida en el cliente (cookies Supabase).
 * También acepta email/password en JSON para login 100% server-side.
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createAcademiaServerClient();

    const contentType = request.headers.get('content-type') ?? '';
    if (contentType.includes('application/json')) {
      const raw = await request.text();
      if (raw.trim()) {
        const body = JSON.parse(raw) as { email?: string; password?: string };
        const email = String(body.email ?? '').trim().toLowerCase();
        const password = String(body.password ?? '');
        if (email && password) {
          const { error } = await supabase.auth.signInWithPassword({ email, password });
          if (error) {
            return NextResponse.json({ error: error.message }, { status: 401 });
          }
        }
      }
    }

    const session = await getAcademiaSession();
    if (!session) {
      return NextResponse.json({ error: 'No hay sesión activa' }, { status: 401 });
    }
    if (!session.role) {
      return NextResponse.json(
        { error: 'Cuenta sin perfil de academia. Completa el registro.' },
        { status: 403 },
      );
    }

    return NextResponse.json({
      ok: true,
      redirect: academiaDashboardPath(session.role),
    });
  } catch (err) {
    console.error('[academia/auth/login]', err);
    return NextResponse.json(
      { error: (err as Error).message || 'Error interno al iniciar sesión' },
      { status: 500 },
    );
  }
}

export async function DELETE() {
  const supabase = await createAcademiaServerClient();
  await supabase.auth.signOut();
  return NextResponse.json({ ok: true });
}
