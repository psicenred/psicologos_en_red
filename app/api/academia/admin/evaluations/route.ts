import { NextResponse } from 'next/server';
import { getAcademiaSession } from '@/lib/academia/auth';
import {
  adminDeleteAssignment,
  adminDeleteExam,
  adminDeleteExamQuestion,
  adminListEvaluations,
  adminUpsertAssignment,
  adminUpsertExam,
  adminUpsertExamQuestion,
} from '@/lib/academia/admin-evaluations';

export async function GET(request: Request) {
  const session = await getAcademiaSession();
  if (!session || session.role !== 'admin') {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
  }

  const courseId = new URL(request.url).searchParams.get('courseId');
  if (!courseId) {
    return NextResponse.json({ error: 'courseId requerido' }, { status: 400 });
  }

  const data = await adminListEvaluations(courseId);
  return NextResponse.json(data);
}

export async function POST(request: Request) {
  const session = await getAcademiaSession();
  if (!session || session.role !== 'admin') {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
  }

  const body = await request.json();
  const courseId = String(body.courseId ?? '');
  const action = String(body.action ?? '');

  try {
    if (action === 'upsert_exam') {
      const exam = await adminUpsertExam(courseId, {
        id: body.exam?.id,
        title: String(body.exam?.title ?? ''),
        weight_pct: Number(body.exam?.weight_pct ?? 0),
        theme_id: body.exam?.theme_id ?? null,
        subtopic_id: body.exam?.subtopic_id ?? null,
        rubric: body.exam?.rubric ?? null,
        due_date: body.exam?.due_date ?? null,
      });
      return NextResponse.json({ exam });
    }

    if (action === 'upsert_assignment') {
      const assignment = await adminUpsertAssignment(courseId, {
        id: body.assignment?.id,
        title: String(body.assignment?.title ?? ''),
        instructions: body.assignment?.instructions ?? null,
        due_date: String(body.assignment?.due_date ?? ''),
        weight_pct: Number(body.assignment?.weight_pct ?? 0),
        late_penalty_pct_per_day: Number(body.assignment?.late_penalty_pct_per_day ?? 10),
        theme_id: body.assignment?.theme_id ?? null,
        subtopic_id: body.assignment?.subtopic_id ?? null,
        rubric: body.assignment?.rubric ?? null,
      });
      return NextResponse.json({ assignment });
    }

    if (action === 'delete_exam') {
      await adminDeleteExam(courseId, String(body.examId ?? ''));
      return NextResponse.json({ ok: true });
    }

    if (action === 'delete_assignment') {
      await adminDeleteAssignment(courseId, String(body.assignmentId ?? ''));
      return NextResponse.json({ ok: true });
    }

    if (action === 'upsert_exam_question') {
      const id = await adminUpsertExamQuestion(courseId, String(body.examId ?? ''), {
        id: body.question?.id,
        question_type: body.question?.question_type === 'essay' ? 'essay' : 'multiple_choice',
        question_text: String(body.question?.question_text ?? ''),
        options: body.question?.options,
        points: Number(body.question?.points ?? 1),
        order_index: Number(body.question?.order_index ?? 0),
      });
      return NextResponse.json({ id });
    }

    if (action === 'delete_exam_question') {
      await adminDeleteExamQuestion(courseId, String(body.questionId ?? ''));
      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ error: 'Acción no válida' }, { status: 400 });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 400 });
  }
}
