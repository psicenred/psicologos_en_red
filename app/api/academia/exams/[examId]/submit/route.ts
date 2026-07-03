import { NextResponse } from 'next/server';
import { getAcademiaSession } from '@/lib/academia/auth';
import { getStudentExamSubmission, submitExam } from '@/lib/academia/exams';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ examId: string }> },
) {
  const session = await getAcademiaSession();
  if (!session || session.role !== 'student') {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
  }

  const { examId } = await params;
  const submission = await getStudentExamSubmission(session.userId, examId);
  return NextResponse.json({ submission });
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ examId: string }> },
) {
  const session = await getAcademiaSession();
  if (!session || session.role !== 'student') {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
  }

  const { examId } = await params;
  const body = await request.json();
  const answers = (body.answers ?? []) as { questionId: string; answerText: string }[];

  try {
    const submission = await submitExam(session.userId, examId, answers);
    return NextResponse.json({ submission });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 400 });
  }
}
