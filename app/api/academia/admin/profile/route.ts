import { NextResponse } from 'next/server';
import { getAcademiaSession } from '@/lib/academia/auth';
import { getAdminProfile, updateAdminProfileFields } from '@/lib/academia/admins';
import { updateAcademiaUserPassword } from '@/lib/academia/profile-auth';

export async function GET() {
  const session = await getAcademiaSession();
  if (!session || session.role !== 'admin') {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
  }

  const profile = await getAdminProfile(session.userId);
  if (!profile) {
    return NextResponse.json({ error: 'Perfil no encontrado' }, { status: 404 });
  }

  return NextResponse.json({ profile });
}

export async function PATCH(request: Request) {
  const session = await getAcademiaSession();
  if (!session || session.role !== 'admin') {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
  }

  try {
    const body = await request.json();
    const fullName = String(body.fullName ?? '').trim();
    const password = body.password != null ? String(body.password) : '';

    if (!fullName) {
      return NextResponse.json({ error: 'El nombre es obligatorio' }, { status: 400 });
    }

    await updateAdminProfileFields(session.userId, fullName);

    if (password) {
      await updateAcademiaUserPassword(password);
    }

    const profile = await getAdminProfile(session.userId);
    return NextResponse.json({ ok: true, profile });
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message || 'No se pudo actualizar el perfil' },
      { status: 400 },
    );
  }
}
