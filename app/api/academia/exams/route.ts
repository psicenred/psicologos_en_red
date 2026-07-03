import { NextResponse } from 'next/server';
import { getAcademiaSession } from '@/lib/academia/auth';
import {
  createExam,
  deleteExamQuestion,
  getExamWithQuestions,
  listExamsForCourse,
  updateExamDueDate,
  upsertExamQuestion,
} from '@/lib/academia/exams';

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

  const exams = await listExamsForCourse(courseId);
  return NextResponse.json({ exams });
}

export async function POST(request: Request) {
  const session = await getAcademiaSession();
  if (!session || session.role !== 'instructor') {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
  }

  const body = await request.json();
  const action = body.action as string;

  if (action === 'create_exam') {
    const exam = await createExam(session.userId, {
      course_id: String(body.courseId),
      title: String(body.title),
      weight_pct: Number(body.weight_pct ?? 0),
      theme_id: body.theme_id ? String(body.theme_id) : null,
      subtopic_id: body.subtopic_id ? String(body.subtopic_id) : null,
      rubric: body.rubric ? String(body.rubric) : null,
      due_date: body.due_date ? String(body.due_date) : null,
    });
    return NextResponse.json({ exam });
  }

  if (action === 'update_due_date') {
    const exam = await updateExamDueDate(
      session.userId,
      String(body.examId ?? ''),
      body.due_date ? String(body.due_date) : null,
    );
    return NextResponse.json({ exam });
  }

  if (action === 'upsert_question') {
    const id = await upsertExamQuestion(session.userId, String(body.examId), {
      id: body.question?.id,
      question_type: body.question.question_type,
      question_text: String(body.question.question_text),
      options: body.question.options,
      points: Number(body.question.points ?? 1),
      order_index: Number(body.question.order_index ?? 0),
    });
    return NextResponse.json({ id });
  }

  if (action === 'delete_question') {
    await deleteExamQuestion(session.userId, String(body.examId), String(body.questionId));
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: 'Acción no válida' }, { status: 400 });
}
