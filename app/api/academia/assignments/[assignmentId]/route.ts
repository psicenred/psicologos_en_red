import { NextResponse } from 'next/server';
import { getAcademiaSession } from '@/lib/academia/auth';
import { getStudentAssignmentSubmission } from '@/lib/academia/assignments';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ assignmentId: string }> },
) {
  const session = await getAcademiaSession();
  if (!session || session.role !== 'student') {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
  }

  const { assignmentId } = await params;
  const submission = await getStudentAssignmentSubmission(session.userId, assignmentId);
  return NextResponse.json({ submission });
}
