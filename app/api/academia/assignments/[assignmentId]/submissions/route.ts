import { NextResponse } from 'next/server';
import { getAcademiaSession } from '@/lib/academia/auth';
import { listAssignmentSubmissionsForInstructor } from '@/lib/academia/assignments';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ assignmentId: string }> },
) {
  const session = await getAcademiaSession();
  if (!session || session.role !== 'instructor') {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
  }

  const { assignmentId } = await params;
  const submissions = await listAssignmentSubmissionsForInstructor(
    assignmentId,
    session.userId,
  );
  return NextResponse.json({ submissions });
}
