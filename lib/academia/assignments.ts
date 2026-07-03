import { getSupabaseServiceClient } from '@/lib/supabase';
import { assertCourseInstructor } from '@/lib/academia/course-instructors';
import { recomputeFinalGrade } from '@/lib/academia/grades';
import type { CourseAssignment, CourseAssignmentSubmission } from '@/lib/academia/types';

export function computeLatePenalty(
  rawScore: number,
  dueDate: string,
  submittedAt: string,
  penaltyPctPerDay: number,
): { isLate: boolean; finalScore: number } {
  const due = new Date(dueDate).getTime();
  const submitted = new Date(submittedAt).getTime();
  if (submitted <= due) {
    return { isLate: false, finalScore: rawScore };
  }

  const msPerDay = 24 * 60 * 60 * 1000;
  const daysLate = Math.ceil((submitted - due) / msPerDay);
  const penalty = rawScore * (penaltyPctPerDay / 100) * daysLate;
  return {
    isLate: true,
    finalScore: Math.max(0, Math.round((rawScore - penalty) * 100) / 100),
  };
}

export async function listAssignmentsForCourse(courseId: string): Promise<CourseAssignment[]> {
  const db = getSupabaseServiceClient();
  const { data, error } = await db
    .from('course_assignments')
    .select('*')
    .eq('course_id', courseId)
    .order('due_date', { ascending: true });

  if (error) throw new Error(error.message);
  return (data ?? []) as CourseAssignment[];
}

export async function createAssignment(
  instructorId: string,
  input: {
    course_id: string;
    title: string;
    instructions?: string;
    due_date: string;
    weight_pct: number;
    late_penalty_pct_per_day?: number;
    attachment_urls?: string[];
    theme_id?: string | null;
    subtopic_id?: string | null;
    rubric?: string | null;
  },
): Promise<CourseAssignment> {
  await assertCourseInstructor(input.course_id, instructorId);
  const db = getSupabaseServiceClient();

  const { data, error } = await db
    .from('course_assignments')
    .insert({
      course_id: input.course_id,
      title: input.title,
      instructions: input.instructions ?? null,
      due_date: input.due_date,
      weight_pct: input.weight_pct,
      late_penalty_pct_per_day: input.late_penalty_pct_per_day ?? 10,
      attachment_urls: input.attachment_urls ?? [],
      theme_id: input.theme_id ?? null,
      subtopic_id: input.subtopic_id ?? null,
      rubric: input.rubric?.trim() || null,
    })
    .select('*')
    .single();

  if (error) throw new Error(error.message);
  return data as CourseAssignment;
}

export async function updateAssignmentDueDate(
  instructorId: string,
  assignmentId: string,
  dueDate: string,
): Promise<CourseAssignment> {
  const assignment = await getAssignmentById(assignmentId);
  if (!assignment) throw new Error('Tarea no encontrada');

  await assertCourseInstructor(assignment.course_id, instructorId);

  const db = getSupabaseServiceClient();
  const { data, error } = await db
    .from('course_assignments')
    .update({ due_date: dueDate })
    .eq('id', assignmentId)
    .select('*')
    .single();

  if (error) throw new Error(error.message);
  return data as CourseAssignment;
}

export async function getAssignmentById(assignmentId: string): Promise<CourseAssignment | null> {
  const db = getSupabaseServiceClient();
  const { data, error } = await db
    .from('course_assignments')
    .select('*')
    .eq('id', assignmentId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return (data as CourseAssignment | null) ?? null;
}

export async function submitAssignment(
  studentId: string,
  assignmentId: string,
  fileUrls: string[],
): Promise<CourseAssignmentSubmission> {
  const assignment = await getAssignmentById(assignmentId);
  if (!assignment) throw new Error('Tarea no encontrada');

  const db = getSupabaseServiceClient();
  const { data: enrollment } = await db
    .from('course_enrollments')
    .select('status')
    .eq('student_id', studentId)
    .eq('course_id', assignment.course_id)
    .maybeSingle();

  if (!enrollment || enrollment.status !== 'active') {
    throw new Error('No tienes acceso activo a este curso');
  }

  const { data: existing } = await db
    .from('course_assignment_submissions')
    .select('id')
    .eq('assignment_id', assignmentId)
    .eq('student_id', studentId)
    .maybeSingle();

  if (existing) throw new Error('Ya enviaste esta tarea');

  const submittedAt = new Date().toISOString();
  const { isLate } = computeLatePenalty(
    0,
    assignment.due_date,
    submittedAt,
    assignment.late_penalty_pct_per_day,
  );

  const { data, error } = await db
    .from('course_assignment_submissions')
    .insert({
      assignment_id: assignmentId,
      student_id: studentId,
      file_urls: fileUrls,
      submitted_at: submittedAt,
      is_late: isLate,
      status: 'submitted',
    })
    .select('*')
    .single();

  if (error) throw new Error(error.message);
  return data as CourseAssignmentSubmission;
}

export async function getStudentAssignmentSubmission(studentId: string, assignmentId: string) {
  const db = getSupabaseServiceClient();
  const { data, error } = await db
    .from('course_assignment_submissions')
    .select('*')
    .eq('assignment_id', assignmentId)
    .eq('student_id', studentId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return (data as CourseAssignmentSubmission | null) ?? null;
}

export async function listAssignmentSubmissionsForInstructor(
  assignmentId: string,
  instructorId: string,
) {
  const assignment = await getAssignmentById(assignmentId);
  if (!assignment) throw new Error('Tarea no encontrada');
  await assertCourseInstructor(assignment.course_id, instructorId);

  const db = getSupabaseServiceClient();
  const { data, error } = await db
    .from('course_assignment_submissions')
    .select(
      `
      *,
      student:course_student_profiles(id, full_name)
    `,
    )
    .eq('assignment_id', assignmentId)
    .order('submitted_at', { ascending: false });

  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function gradeAssignmentSubmission(
  instructorId: string,
  submissionId: string,
  input: { rawScore: number; feedback?: string },
): Promise<CourseAssignmentSubmission> {
  const db = getSupabaseServiceClient();
  const { data: submission, error } = await db
    .from('course_assignment_submissions')
    .select('*, assignment:course_assignments(*)')
    .eq('id', submissionId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!submission) throw new Error('Entrega no encontrada');

  const assignment = submission.assignment as CourseAssignment;
  await assertCourseInstructor(assignment.course_id, instructorId);

  const { finalScore } = computeLatePenalty(
    input.rawScore,
    assignment.due_date,
    submission.submitted_at as string,
    assignment.late_penalty_pct_per_day,
  );

  const { data: updated, error: upErr } = await db
    .from('course_assignment_submissions')
    .update({
      raw_score: input.rawScore,
      final_score: finalScore,
      instructor_feedback: input.feedback ?? null,
      status: 'graded',
    })
    .eq('id', submissionId)
    .select('*')
    .single();

  if (upErr) throw new Error(upErr.message);

  await recomputeFinalGrade(submission.student_id as string, assignment.course_id);
  return updated as CourseAssignmentSubmission;
}

export async function listPendingSubmissionsForCourse(courseId: string, instructorId: string) {
  await assertCourseInstructor(courseId, instructorId);
  const db = getSupabaseServiceClient();

  const { data: exams } = await db.from('course_exams').select('id, title').eq('course_id', courseId);
  const examIds = (exams ?? []).map((e) => e.id);

  const { data: assignments } = await db
    .from('course_assignments')
    .select('id, title')
    .eq('course_id', courseId);
  const assignmentIds = (assignments ?? []).map((a) => a.id);

  const examPending =
    examIds.length > 0
      ? await db
          .from('course_exam_submissions')
          .select('id, exam_id, student_id, submitted_at, status')
          .in('exam_id', examIds)
          .eq('status', 'submitted')
      : { data: [] };

  const assignmentPending =
    assignmentIds.length > 0
      ? await db
          .from('course_assignment_submissions')
          .select('id, assignment_id, student_id, submitted_at, status')
          .in('assignment_id', assignmentIds)
          .eq('status', 'submitted')
      : { data: [] };

  return {
    exams: (examPending.data ?? []).map((s) => ({
      ...s,
      type: 'exam' as const,
      title: exams?.find((e) => e.id === s.exam_id)?.title ?? 'Examen',
    })),
    assignments: (assignmentPending.data ?? []).map((s) => ({
      ...s,
      type: 'assignment' as const,
      title: assignments?.find((a) => a.id === s.assignment_id)?.title ?? 'Tarea',
    })),
  };
}
