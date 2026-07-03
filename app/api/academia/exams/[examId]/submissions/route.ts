import { NextResponse } from 'next/server';
import { getAcademiaSession } from '@/lib/academia/auth';
import { listExamSubmissionsForInstructor } from '@/lib/academia/exams';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ examId: string }> },
) {
  const session = await getAcademiaSession();
  if (!session || session.role !== 'instructor') {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
  }

  const { examId } = await params;
  const submissions = await listExamSubmissionsForInstructor(examId, session.userId);
  return NextResponse.json({ submissions });
}
