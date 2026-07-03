import { NextResponse } from 'next/server';
import { createAcademiaProfile } from '@/lib/academia/auth';
import { createAcademiaServerClient } from '@/lib/academia/supabase/server';

export async function POST(request: Request) {
  const body = await request.json();
  const email = String(body.email ?? '').trim().toLowerCase();
  const password = String(body.password ?? '');
  const fullName = String(body.fullName ?? '').trim();
  const phone = String(body.phone ?? '').trim();

  if (!email || !password || !fullName) {
    return NextResponse.json({ error: 'Datos incompletos' }, { status: 400 });
  }

  const role = 'student' as const;

  if (password.length < 8) {
    return NextResponse.json(
      { error: 'La contraseña debe tener al menos 8 caracteres' },
      { status: 400 },
    );
  }

  const supabase = await createAcademiaServerClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { academia_role: role, full_name: fullName },
      emailRedirectTo: `${new URL(request.url).origin}/api/academia/auth/callback?next=/cursos`,
    },
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  if (!data.user) {
    return NextResponse.json({ error: 'No se pudo crear la cuenta' }, { status: 500 });
  }

  const profile = await createAcademiaProfile(
    data.user.id,
    role,
    fullName,
    phone || undefined,
  );

  if (!profile.ok) {
    return NextResponse.json({ error: profile.error }, { status: 400 });
  }

  return NextResponse.json({
    ok: true,
    needsEmailConfirmation: !data.session,
    userId: data.user.id,
  });
}
