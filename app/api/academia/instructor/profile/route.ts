import { NextResponse } from 'next/server';
import { getAcademiaSession } from '@/lib/academia/auth';
import {
  getInstructorProfile,
  updateInstructorProfileFields,
} from '@/lib/academia/instructors';
import {
  updateAcademiaUserPassword,
} from '@/lib/academia/profile-auth';

export async function GET() {
  const session = await getAcademiaSession();
  if (!session || session.role !== 'instructor') {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
  }

  const profile = await getInstructorProfile(session.userId);
  if (!profile) {
    return NextResponse.json({ error: 'Perfil no encontrado' }, { status: 404 });
  }

  return NextResponse.json({ profile });
}

export async function PATCH(request: Request) {
  const session = await getAcademiaSession();
  if (!session || session.role !== 'instructor') {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
  }

  try {
    const body = await request.json();
    const fullName = String(body.fullName ?? '').trim();
    const bio = body.bio != null ? String(body.bio).trim() : null;
    const password = body.password != null ? String(body.password) : '';

    if (!fullName) {
      return NextResponse.json({ error: 'El nombre es obligatorio' }, { status: 400 });
    }

    await updateInstructorProfileFields(session.userId, fullName, bio || null);

    if (password) {
      await updateAcademiaUserPassword(password);
    }

    const profile = await getInstructorProfile(session.userId);
    return NextResponse.json({ ok: true, profile });
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message || 'No se pudo actualizar el perfil' },
      { status: 400 },
    );
  }
}
