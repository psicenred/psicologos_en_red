import { NextResponse } from 'next/server';
import { getAcademiaSession } from '@/lib/academia/auth';
import { listCourseSubmissionsForReview } from '@/lib/academia/submission-review';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ courseId: string }> },
) {
  const session = await getAcademiaSession();
  if (!session || session.role !== 'instructor') {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
  }

  const { courseId } = await params;

  try {
    const evaluations = await listCourseSubmissionsForReview(courseId, session.userId);
    return NextResponse.json({ evaluations });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 400 });
  }
}
