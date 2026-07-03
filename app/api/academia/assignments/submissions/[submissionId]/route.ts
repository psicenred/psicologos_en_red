import { NextResponse } from 'next/server';
import { getAcademiaSession } from '@/lib/academia/auth';
import { getAssignmentSubmissionDetail } from '@/lib/academia/submission-review';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ submissionId: string }> },
) {
  const session = await getAcademiaSession();
  if (!session || (session.role !== 'instructor' && session.role !== 'student')) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
  }

  const { submissionId } = await params;

  try {
    const data = await getAssignmentSubmissionDetail(
      submissionId,
      session.role === 'instructor' ? 'instructor' : 'student',
      session.userId,
    );
    if (!data) {
      return NextResponse.json({ error: 'No encontrado' }, { status: 404 });
    }
    return NextResponse.json(data);
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 403 });
  }
}
