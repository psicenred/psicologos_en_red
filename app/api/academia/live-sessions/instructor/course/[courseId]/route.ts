import { NextResponse } from 'next/server';
import { getAcademiaSession } from '@/lib/academia/auth';
import { getInstructorLiveSessions } from '@/lib/academia/cohorts';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ courseId: string }> },
) {
  const session = await getAcademiaSession();
  if (!session || session.role !== 'instructor') {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
  }

  const { courseId } = await params;
  const sessions = await getInstructorLiveSessions(session.userId, courseId);
  return NextResponse.json({ sessions });
}
