import { NextResponse } from 'next/server';
import { getAcademiaSession } from '@/lib/academia/auth';
import { getStudentLiveSessions } from '@/lib/academia/cohorts';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ courseId: string }> },
) {
  const session = await getAcademiaSession();
  if (!session || session.role !== 'student') {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
  }

  const { courseId } = await params;
  const data = await getStudentLiveSessions(session.userId, courseId);
  return NextResponse.json(data);
}
