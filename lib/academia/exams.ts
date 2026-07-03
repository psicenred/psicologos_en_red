import { getSupabaseServiceClient } from '@/lib/supabase';
import { assertCourseInstructor } from '@/lib/academia/course-instructors';
import { recomputeFinalGrade } from '@/lib/academia/grades';
import type {
  CourseExam,
  CourseExamAnswer,
  CourseExamQuestion,
  CourseExamSubmission,
  ExamOption,
  ExamWithQuestions,
} from '@/lib/academia/types';

export async function listExamsForCourse(courseId: string): Promise<CourseExam[]> {
  const db = getSupabaseServiceClient();
  const { data, error } = await db
    .from('course_exams')
    .select('*')
    .eq('course_id', courseId)
    .order('created_at', { ascending: true });

  if (error) throw new Error(error.message);
  return (data ?? []) as CourseExam[];
}

export async function getExamWithQuestions(examId: string): Promise<ExamWithQuestions | null> {
  const db = getSupabaseServiceClient();
  const { data: exam, error } = await db
    .from('course_exams')
    .select('*')
    .eq('id', examId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!exam) return null;

  const { data: questions, error: qErr } = await db
    .from('course_exam_questions')
    .select('*')
    .eq('exam_id', examId)
    .order('order_index', { ascending: true });

  if (qErr) throw new Error(qErr.message);

  return {
    ...(exam as CourseExam),
    questions: (questions ?? []) as CourseExamQuestion[],
  };
}

export async function createExam(
  instructorId: string,
  input: {
    course_id: string;
    title: string;
    weight_pct: number;
    theme_id?: string | null;
    subtopic_id?: string | null;
    rubric?: string | null;
    due_date?: string | null;
  },
): Promise<CourseExam> {
  await assertCourseInstructor(input.course_id, instructorId);
  const db = getSupabaseServiceClient();

  const { data, error } = await db
    .from('course_exams')
    .insert({
      course_id: input.course_id,
      title: input.title,
      weight_pct: input.weight_pct,
      theme_id: input.theme_id ?? null,
      subtopic_id: input.subtopic_id ?? null,
      rubric: input.rubric?.trim() || null,
      due_date: input.due_date || null,
    })
    .select('*')
    .single();

  if (error) throw new Error(error.message);
  return data as CourseExam;
}

export async function updateExamDueDate(
  instructorId: string,
  examId: string,
  dueDate: string | null,
): Promise<CourseExam> {
  const db = getSupabaseServiceClient();
  const { data: exam, error: fetchError } = await db
    .from('course_exams')
    .select('*')
    .eq('id', examId)
    .maybeSingle();

  if (fetchError) throw new Error(fetchError.message);
  if (!exam) throw new Error('Examen no encontrado');

  await assertCourseInstructor(exam.course_id as string, instructorId);

  const { data, error } = await db
    .from('course_exams')
    .update({ due_date: dueDate })
    .eq('id', examId)
    .select('*')
    .single();

  if (error) throw new Error(error.message);
  return data as CourseExam;
}

export async function upsertExamQuestion(
  instructorId: string,
  examId: string,
  question: {
    id?: string;
    question_type: 'multiple_choice' | 'essay';
    question_text: string;
    options?: ExamOption[];
    points?: number;
    order_index?: number;
  },
): Promise<string> {
  const exam = await getExamWithQuestions(examId);
  if (!exam) throw new Error('Examen no encontrado');
  await assertCourseInstructor(exam.course_id, instructorId);

  const db = getSupabaseServiceClient();
  const payload = {
    exam_id: examId,
    question_type: question.question_type,
    question_text: question.question_text,
    options: question.question_type === 'multiple_choice' ? question.options ?? [] : null,
    points: question.points ?? 1,
    order_index: question.order_index ?? 0,
  };

  if (question.id) {
    const { error } = await db.from('course_exam_questions').update(payload).eq('id', question.id);
    if (error) throw new Error(error.message);
    return question.id;
  }

  const { data, error } = await db
    .from('course_exam_questions')
    .insert(payload)
    .select('id')
    .single();

  if (error) throw new Error(error.message);
  return data.id as string;
}

export async function deleteExamQuestion(
  instructorId: string,
  examId: string,
  questionId: string,
): Promise<void> {
  const exam = await getExamWithQuestions(examId);
  if (!exam) throw new Error('Examen no encontrado');
  await assertCourseInstructor(exam.course_id, instructorId);

  const db = getSupabaseServiceClient();
  const { error } = await db
    .from('course_exam_questions')
    .delete()
    .eq('id', questionId)
    .eq('exam_id', examId);
  if (error) throw new Error(error.message);
}

function scoreMultipleChoice(
  question: CourseExamQuestion,
  answerText: string | null,
): { isCorrect: boolean; pointsAwarded: number } {
  const options = (question.options ?? []) as ExamOption[];
  const selected = options.find((o) => o.id === answerText);
  const correct = options.find((o) => o.is_correct);
  const isCorrect = Boolean(selected && correct && selected.id === correct.id);
  return {
    isCorrect,
    pointsAwarded: isCorrect ? Number(question.points) : 0,
  };
}

export async function submitExam(
  studentId: string,
  examId: string,
  answers: { questionId: string; answerText: string }[],
): Promise<CourseExamSubmission> {
  const exam = await getExamWithQuestions(examId);
  if (!exam) throw new Error('Examen no encontrado');

  const db = getSupabaseServiceClient();
  const { data: enrollment } = await db
    .from('course_enrollments')
    .select('status')
    .eq('student_id', studentId)
    .eq('course_id', exam.course_id)
    .maybeSingle();

  if (!enrollment || enrollment.status !== 'active') {
    throw new Error('No tienes acceso activo a este curso');
  }

  const { data: existing } = await db
    .from('course_exam_submissions')
    .select('id')
    .eq('exam_id', examId)
    .eq('student_id', studentId)
    .maybeSingle();

  if (existing) throw new Error('Ya enviaste este examen');

  let autoScore = 0;
  let totalPoints = 0;
  const answerRows: Omit<CourseExamAnswer, 'submission_id'>[] = [];

  for (const q of exam.questions) {
    totalPoints += Number(q.points);
    const ans = answers.find((a) => a.questionId === q.id);
    if (q.question_type === 'multiple_choice') {
      const scored = scoreMultipleChoice(q, ans?.answerText ?? null);
      autoScore += scored.pointsAwarded;
      answerRows.push({
        question_id: q.id,
        answer_text: ans?.answerText ?? null,
        is_correct: scored.isCorrect,
        points_awarded: scored.pointsAwarded,
        instructor_feedback: null,
      });
    } else {
      answerRows.push({
        question_id: q.id,
        answer_text: ans?.answerText ?? null,
        is_correct: null,
        points_awarded: null,
        instructor_feedback: null,
      });
    }
  }

  const normalizedAutoScore =
    totalPoints > 0 ? Math.round((autoScore / totalPoints) * 100) : null;

  const { data: submission, error: subErr } = await db
    .from('course_exam_submissions')
    .insert({
      exam_id: examId,
      student_id: studentId,
      status: 'submitted',
      auto_score: normalizedAutoScore,
    })
    .select('*')
    .single();

  if (subErr) throw new Error(subErr.message);

  const submissionId = submission.id as string;
  const { error: ansErr } = await db.from('course_exam_answers').insert(
    answerRows.map((a) => ({
      submission_id: submissionId,
      ...a,
    })),
  );

  if (ansErr) throw new Error(ansErr.message);

  return submission as CourseExamSubmission;
}

export async function getStudentExamSubmission(studentId: string, examId: string) {
  const db = getSupabaseServiceClient();
  const { data, error } = await db
    .from('course_exam_submissions')
    .select('*')
    .eq('exam_id', examId)
    .eq('student_id', studentId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return (data as CourseExamSubmission | null) ?? null;
}

export async function listExamSubmissionsForInstructor(examId: string, instructorId: string) {
  const exam = await getExamWithQuestions(examId);
  if (!exam) throw new Error('Examen no encontrado');
  await assertCourseInstructor(exam.course_id, instructorId);

  const db = getSupabaseServiceClient();
  const { data, error } = await db
    .from('course_exam_submissions')
    .select(
      `
      *,
      student:course_student_profiles(id, full_name)
    `,
    )
    .eq('exam_id', examId)
    .order('submitted_at', { ascending: false });

  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function gradeExamSubmission(
  instructorId: string,
  submissionId: string,
  input: {
    essayGrades?: { questionId: string; pointsAwarded: number; feedback?: string }[];
    finalScore?: number;
    release?: boolean;
  },
) {
  const db = getSupabaseServiceClient();
  const { data: submission, error } = await db
    .from('course_exam_submissions')
    .select('*, exam:course_exams(id, course_id)')
    .eq('id', submissionId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!submission) throw new Error('Entrega no encontrada');

  const exam = submission.exam as { id: string; course_id: string };
  await assertCourseInstructor(exam.course_id, instructorId);

  if (input.essayGrades?.length) {
    for (const g of input.essayGrades) {
      await db
        .from('course_exam_answers')
        .update({
          points_awarded: g.pointsAwarded,
          instructor_feedback: g.feedback ?? null,
        })
        .eq('submission_id', submissionId)
        .eq('question_id', g.questionId);
    }
  }

  const examFull = await getExamWithQuestions(exam.id);
  let finalScore = input.finalScore ?? submission.auto_score;

  if (input.essayGrades?.length && examFull) {
    const { data: answers } = await db
      .from('course_exam_answers')
      .select('points_awarded, question_id')
      .eq('submission_id', submissionId);

    let earned = 0;
    let total = 0;
    for (const q of examFull.questions) {
      total += Number(q.points);
      const a = answers?.find((x) => x.question_id === q.id);
      earned += Number(a?.points_awarded ?? 0);
    }
    finalScore = total > 0 ? Math.round((earned / total) * 100) : finalScore;
  }

  const status = input.release ? 'released' : 'graded';
  const now = new Date().toISOString();

  const { data: updated, error: upErr } = await db
    .from('course_exam_submissions')
    .update({
      status,
      final_score: input.release ? finalScore : submission.final_score ?? finalScore,
      graded_at: now,
    })
    .eq('id', submissionId)
    .select('*')
    .single();

  if (upErr) throw new Error(upErr.message);

  if (input.release && finalScore != null) {
    await recomputeFinalGrade(submission.student_id as string, exam.course_id);
  }

  return updated as CourseExamSubmission;
}

export async function releaseExamSubmission(instructorId: string, submissionId: string) {
  const db = getSupabaseServiceClient();
  const { data: submission } = await db
    .from('course_exam_submissions')
    .select('*, exam:course_exams(course_id)')
    .eq('id', submissionId)
    .maybeSingle();

  if (!submission) throw new Error('Entrega no encontrada');
  const courseId = (submission.exam as { course_id: string }).course_id;
  await assertCourseInstructor(courseId, instructorId);

  const finalScore = submission.final_score ?? submission.auto_score;
  const { data, error } = await db
    .from('course_exam_submissions')
    .update({
      status: 'released',
      final_score: finalScore,
      graded_at: submission.graded_at ?? new Date().toISOString(),
    })
    .eq('id', submissionId)
    .select('*')
    .single();

  if (error) throw new Error(error.message);
  if (finalScore != null) {
    await recomputeFinalGrade(submission.student_id as string, courseId);
  }
  return data as CourseExamSubmission;
}

export async function getSubmissionWithAnswers(submissionId: string, viewerRole: 'student' | 'instructor', viewerId: string) {
  const db = getSupabaseServiceClient();
  const { data: submission, error } = await db
    .from('course_exam_submissions')
    .select('*, exam:course_exams(*)')
    .eq('id', submissionId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!submission) return null;

  const exam = submission.exam as CourseExam;
  if (viewerRole === 'student' && submission.student_id !== viewerId) {
    throw new Error('No autorizado');
  }
  if (viewerRole === 'instructor') {
    await assertCourseInstructor(exam.course_id, viewerId);
  }

  const { data: answers } = await db
    .from('course_exam_answers')
    .select('*')
    .eq('submission_id', submissionId);

  const { data: questions } = await db
    .from('course_exam_questions')
    .select('*')
    .eq('exam_id', exam.id)
    .order('order_index', { ascending: true });

  return {
    submission: submission as CourseExamSubmission & { exam: CourseExam },
    answers: (answers ?? []) as CourseExamAnswer[],
    questions: (questions ?? []) as CourseExamQuestion[],
  };
}
