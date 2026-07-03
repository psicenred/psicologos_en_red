import { NextResponse } from 'next/server';
import { getAcademiaSession } from '@/lib/academia/auth';
import { getLessonProgress, markLessonComplete } from '@/lib/academia/enrollments';

export async function GET(request: Request) {
  const session = await getAcademiaSession();
  if (!session || session.role !== 'student') {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
  }

  const courseId = new URL(request.url).searchParams.get('courseId');
  if (!courseId) {
    return NextResponse.json({ error: 'courseId requerido' }, { status: 400 });
  }

  const progress = await getLessonProgress(session.userId, courseId);
  return NextResponse.json({ progress });
}

export async function POST(request: Request) {
  const session = await getAcademiaSession();
  if (!session || session.role !== 'student') {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
  }

  const body = await request.json();
  const lessonId = String(body.lessonId ?? '');
  if (!lessonId) {
    return NextResponse.json({ error: 'Lección requerida' }, { status: 400 });
  }

  await markLessonComplete(session.userId, lessonId);
  return NextResponse.json({ ok: true });
}
