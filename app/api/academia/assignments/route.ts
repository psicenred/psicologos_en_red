import { NextResponse } from 'next/server';
import { getAcademiaSession } from '@/lib/academia/auth';
import {
  createAssignment,
  listAssignmentsForCourse,
  submitAssignment,
  updateAssignmentDueDate,
} from '@/lib/academia/assignments';

export async function GET(request: Request) {
  const session = await getAcademiaSession();
  if (!session) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const courseId = searchParams.get('courseId');
  if (!courseId) {
    return NextResponse.json({ error: 'courseId requerido' }, { status: 400 });
  }

  const assignments = await listAssignmentsForCourse(courseId);
  return NextResponse.json({ assignments });
}

export async function POST(request: Request) {
  const session = await getAcademiaSession();
  if (!session) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
  }

  const body = await request.json();
  const action = body.action as string;

  if (action === 'create_assignment' && session.role === 'instructor') {
    const assignment = await createAssignment(session.userId, {
      course_id: String(body.courseId),
      title: String(body.title),
      instructions: body.instructions,
      due_date: String(body.due_date),
      weight_pct: Number(body.weight_pct ?? 0),
      late_penalty_pct_per_day: Number(body.late_penalty_pct_per_day ?? 10),
      attachment_urls: body.attachment_urls,
      theme_id: body.theme_id ? String(body.theme_id) : null,
      subtopic_id: body.subtopic_id ? String(body.subtopic_id) : null,
      rubric: body.rubric ? String(body.rubric) : null,
    });
    return NextResponse.json({ assignment });
  }

  if (action === 'update_due_date' && session.role === 'instructor') {
    const assignment = await updateAssignmentDueDate(
      session.userId,
      String(body.assignmentId ?? ''),
      String(body.due_date ?? ''),
    );
    return NextResponse.json({ assignment });
  }

  if (action === 'submit' && session.role === 'student') {
    try {
      const submission = await submitAssignment(
        session.userId,
        String(body.assignmentId),
        (body.fileUrls ?? []) as string[],
      );
      return NextResponse.json({ submission });
    } catch (err) {
      return NextResponse.json({ error: (err as Error).message }, { status: 400 });
    }
  }

  return NextResponse.json({ error: 'Acción no válida' }, { status: 400 });
}
