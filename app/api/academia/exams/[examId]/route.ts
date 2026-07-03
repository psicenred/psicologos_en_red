import { NextResponse } from 'next/server';
import { getAcademiaSession } from '@/lib/academia/auth';
import { getExamWithQuestions } from '@/lib/academia/exams';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ examId: string }> },
) {
  const session = await getAcademiaSession();
  if (!session) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
  }

  const { examId } = await params;
  const exam = await getExamWithQuestions(examId);
  if (!exam) {
    return NextResponse.json({ error: 'Examen no encontrado' }, { status: 404 });
  }

  if (session.role === 'student') {
    exam.questions = exam.questions.map((q) => {
      if (q.question_type !== 'multiple_choice') return q;
      return {
        ...q,
        options: (q.options ?? []).map((o) => ({ id: o.id, text: o.text })),
      };
    });
  }

  return NextResponse.json({ exam });
}
