import { getSupabaseServiceClient } from '@/lib/supabase';
import { getCourseById } from '@/lib/academia/courses';
import type { CoursePassStatus } from '@/lib/academia/types';

export async function getStudentAttendancePct(
  studentId: string,
  courseId: string,
): Promise<number | null> {
  const course = await getCourseById(courseId);
  if (!course || course.format !== 'sync') return null;

  const db = getSupabaseServiceClient();
  const { data: cohorts } = await db.from('course_cohorts').select('id').eq('course_id', courseId);
  const cohortIds = (cohorts ?? []).map((c) => c.id as string);
  if (!cohortIds.length) return null;

  const { data: sessions } = await db
    .from('course_live_sessions')
    .select('id')
    .in('cohort_id', cohortIds)
    .eq('status', 'completed');

  const sessionIds = (sessions ?? []).map((s) => s.id as string);
  if (!sessionIds.length) return null;

  const { count: attended } = await db
    .from('course_attendance')
    .select('id', { count: 'exact', head: true })
    .in('live_session_id', sessionIds)
    .eq('student_id', studentId)
    .eq('attended', true);

  return Math.round(((attended ?? 0) / sessionIds.length) * 100);
}

export async function setStudentPassStatus(
  courseId: string,
  studentId: string,
  passStatus: CoursePassStatus,
) {
  const course = await getCourseById(courseId);
  if (!course) throw new Error('Curso no encontrado');
  if ((course.grading_mode ?? 'weighted') !== 'pass_fail') {
    throw new Error('Este curso usa calificación ponderada, no aprobado/reprobado');
  }

  const db = getSupabaseServiceClient();
  const computedGrade = passStatus === 'passed' ? 100 : passStatus === 'failed' ? 0 : null;

  const { error } = await db.from('course_final_grades').upsert(
    {
      student_id: studentId,
      course_id: courseId,
      pass_status: passStatus,
      computed_grade: computedGrade,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'student_id,course_id' },
  );

  if (error) throw new Error(error.message);
}
