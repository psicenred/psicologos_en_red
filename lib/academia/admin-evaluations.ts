import { getSupabaseServiceClient } from '@/lib/supabase';
import { getCourseById } from '@/lib/academia/courses';
import type { CourseAssignment, CourseExam } from '@/lib/academia/types';

async function assertCourseExists(courseId: string) {
  const course = await getCourseById(courseId);
  if (!course) throw new Error('Curso no encontrado');
  return course;
}

export async function adminListEvaluations(courseId: string): Promise<{
  exams: CourseExam[];
  assignments: CourseAssignment[];
}> {
  await assertCourseExists(courseId);
  const db = getSupabaseServiceClient();

  const [{ data: exams, error: e1 }, { data: assignments, error: e2 }] = await Promise.all([
    db.from('course_exams').select('*').eq('course_id', courseId).order('created_at'),
    db
      .from('course_assignments')
      .select('*')
      .eq('course_id', courseId)
      .order('due_date', { ascending: true }),
  ]);

  if (e1) throw new Error(e1.message);
  if (e2) throw new Error(e2.message);

  return {
    exams: (exams ?? []) as CourseExam[],
    assignments: (assignments ?? []) as CourseAssignment[],
  };
}

export async function adminUpsertExam(
  courseId: string,
  input: {
    id?: string;
    title: string;
    weight_pct: number;
    theme_id?: string | null;
    subtopic_id?: string | null;
    rubric?: string | null;
    due_date?: string | null;
  },
): Promise<CourseExam> {
  await assertCourseExists(courseId);
  const db = getSupabaseServiceClient();

  const payload = {
    course_id: courseId,
    title: input.title.trim(),
    weight_pct: input.weight_pct,
    theme_id: input.theme_id ?? null,
    subtopic_id: input.subtopic_id ?? null,
    rubric: input.rubric?.trim() || null,
    due_date: input.due_date || null,
  };

  if (input.id) {
    const { data, error } = await db
      .from('course_exams')
      .update(payload)
      .eq('id', input.id)
      .eq('course_id', courseId)
      .select('*')
      .single();
    if (error) throw new Error(error.message);
    return data as CourseExam;
  }

  const { data, error } = await db.from('course_exams').insert(payload).select('*').single();
  if (error) throw new Error(error.message);
  return data as CourseExam;
}

export async function adminDeleteExam(courseId: string, examId: string) {
  await assertCourseExists(courseId);
  const db = getSupabaseServiceClient();
  const { error } = await db
    .from('course_exams')
    .delete()
    .eq('id', examId)
    .eq('course_id', courseId);
  if (error) throw new Error(error.message);
}

export async function adminUpsertAssignment(
  courseId: string,
  input: {
    id?: string;
    title: string;
    instructions?: string | null;
    due_date: string;
    weight_pct: number;
    late_penalty_pct_per_day?: number;
    theme_id?: string | null;
    subtopic_id?: string | null;
    rubric?: string | null;
  },
): Promise<CourseAssignment> {
  await assertCourseExists(courseId);
  const db = getSupabaseServiceClient();

  const payload = {
    course_id: courseId,
    title: input.title.trim(),
    instructions: input.instructions?.trim() || null,
    due_date: input.due_date,
    weight_pct: input.weight_pct,
    late_penalty_pct_per_day: input.late_penalty_pct_per_day ?? 10,
    theme_id: input.theme_id ?? null,
    subtopic_id: input.subtopic_id ?? null,
    rubric: input.rubric?.trim() || null,
  };

  if (input.id) {
    const { data, error } = await db
      .from('course_assignments')
      .update(payload)
      .eq('id', input.id)
      .eq('course_id', courseId)
      .select('*')
      .single();
    if (error) throw new Error(error.message);
    return data as CourseAssignment;
  }

  const { data, error } = await db.from('course_assignments').insert(payload).select('*').single();
  if (error) throw new Error(error.message);
  return data as CourseAssignment;
}

export async function adminDeleteAssignment(courseId: string, assignmentId: string) {
  await assertCourseExists(courseId);
  const db = getSupabaseServiceClient();
  const { error } = await db
    .from('course_assignments')
    .delete()
    .eq('id', assignmentId)
    .eq('course_id', courseId);
  if (error) throw new Error(error.message);
}

export async function adminUpsertExamQuestion(
  courseId: string,
  examId: string,
  question: {
    id?: string;
    question_type: 'multiple_choice' | 'essay';
    question_text: string;
    options?: { id: string; text: string; is_correct?: boolean }[];
    points?: number;
    order_index?: number;
  },
): Promise<string> {
  await assertCourseExists(courseId);
  const db = getSupabaseServiceClient();

  const { data: exam, error: examErr } = await db
    .from('course_exams')
    .select('id')
    .eq('id', examId)
    .eq('course_id', courseId)
    .maybeSingle();

  if (examErr) throw new Error(examErr.message);
  if (!exam) throw new Error('Examen no encontrado en este curso');

  const payload = {
    exam_id: examId,
    question_type: question.question_type,
    question_text: question.question_text.trim(),
    options: question.question_type === 'multiple_choice' ? question.options ?? [] : null,
    points: question.points ?? 1,
    order_index: question.order_index ?? 0,
  };

  if (question.id) {
    const { error } = await db
      .from('course_exam_questions')
      .update(payload)
      .eq('id', question.id);
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

export async function adminDeleteExamQuestion(courseId: string, questionId: string) {
  await assertCourseExists(courseId);
  const db = getSupabaseServiceClient();

  const { data: question, error: qErr } = await db
    .from('course_exam_questions')
    .select('exam_id')
    .eq('id', questionId)
    .maybeSingle();

  if (qErr) throw new Error(qErr.message);
  if (!question) throw new Error('Pregunta no encontrada');

  const { data: exam } = await db
    .from('course_exams')
    .select('id')
    .eq('id', question.exam_id)
    .eq('course_id', courseId)
    .maybeSingle();

  if (!exam) throw new Error('No autorizado');

  const { error } = await db.from('course_exam_questions').delete().eq('id', questionId);
  if (error) throw new Error(error.message);
}
