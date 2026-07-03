import { NextResponse } from 'next/server';
import { getAcademiaSession } from '@/lib/academia/auth';
import {
  getSubmissionWithAnswers,
  gradeExamSubmission,
  releaseExamSubmission,
} from '@/lib/academia/exams';

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
    const data = await getSubmissionWithAnswers(
      submissionId,
      session.role === 'instructor' ? 'instructor' : 'student',
      session.userId,
    );
    if (!data) {
      return NextResponse.json({ error: 'No encontrado' }, { status: 404 });
    }

    if (session.role === 'student' && data.submission.status !== 'released') {
      return NextResponse.json({
        submission: {
          ...data.submission,
          final_score: null,
          auto_score: null,
        },
        answers: data.answers.map((a) => ({
          ...a,
          is_correct: null,
          points_awarded: null,
        })),
        questions: data.questions,
        message: 'Tu calificación aún no ha sido liberada',
      });
    }

    return NextResponse.json(data);
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 403 });
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ submissionId: string }> },
) {
  const session = await getAcademiaSession();
  if (!session || session.role !== 'instructor') {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
  }

  const { submissionId } = await params;
  const body = await request.json();
  const action = body.action as string;

  try {
    if (action === 'release') {
      const submission = await releaseExamSubmission(session.userId, submissionId);
      return NextResponse.json({ submission });
    }

    const submission = await gradeExamSubmission(session.userId, submissionId, {
      essayGrades: body.essayGrades,
      finalScore: body.finalScore != null ? Number(body.finalScore) : undefined,
      release: Boolean(body.release),
    });
    return NextResponse.json({ submission });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 400 });
  }
}
