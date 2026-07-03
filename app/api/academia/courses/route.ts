import { NextResponse } from 'next/server';
import { getAcademiaSession } from '@/lib/academia/auth';
import { listInstructorCourses } from '@/lib/academia/courses';

/** Cursos asignados al instructor. */
export async function GET() {
  const session = await getAcademiaSession();
  if (!session || session.role !== 'instructor') {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
  }

  const courses = await listInstructorCourses(session.userId);
  return NextResponse.json({ courses });
}

/** La edición de módulos/lecciones queda reservada al administrador. */
export async function PUT() {
  return NextResponse.json(
    { error: 'Solo el administrador puede editar el material del curso' },
    { status: 403 },
  );
}
