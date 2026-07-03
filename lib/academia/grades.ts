import { getSupabaseServiceClient } from '@/lib/supabase';
import { assertCourseInstructor } from '@/lib/academia/course-instructors';
import { getCourseById } from '@/lib/academia/courses';
import { computeEvaluationProgress } from '@/lib/academia/evaluation-progress';
import { getStudentAttendancePct } from '@/lib/academia/pass-status';
import type { CourseFinalGrade, InstructorCourseMetrics } from '@/lib/academia/types';

export async function recomputeFinalGrade(studentId: string, courseId: string) {
  const course = await getCourseById(courseId);
  if (!course) throw new Error('Curso no encontrado');

  const gradingMode = course.grading_mode ?? 'weighted';
  const db = getSupabaseServiceClient();
  const now = new Date().toISOString();

  if (gradingMode === 'pass_fail') {
    const { data: existing } = await db
      .from('course_final_grades')
      .select('pass_status, computed_grade')
      .eq('student_id', studentId)
      .eq('course_id', courseId)
      .maybeSingle();

    return existing?.computed_grade != null ? Number(existing.computed_grade) : null;
  }

  const { data: exams } = await db
    .from('course_exams')
    .select('id, weight_pct')
    .eq('course_id', courseId);

  const { data: assignments } = await db
    .from('course_assignments')
    .select('id, weight_pct')
    .eq('course_id', courseId);

  let grade = 0;

  for (const exam of exams ?? []) {
    const weight = Number(exam.weight_pct);
    if (weight <= 0) continue;

    const { data: sub } = await db
      .from('course_exam_submissions')
      .select('final_score, status')
      .eq('exam_id', exam.id)
      .eq('student_id', studentId)
      .maybeSingle();

    const score =
      sub?.status === 'released' && sub.final_score != null ? Number(sub.final_score) : 0;
    grade += score * (weight / 100);
  }

  for (const assignment of assignments ?? []) {
    const weight = Number(assignment.weight_pct);
    if (weight <= 0) continue;

    const { data: sub } = await db
      .from('course_assignment_submissions')
      .select('final_score, status')
      .eq('assignment_id', assignment.id)
      .eq('student_id', studentId)
      .maybeSingle();

    const score = sub?.status === 'graded' && sub.final_score != null ? Number(sub.final_score) : 0;
    grade += score * (weight / 100);
  }

  const attendanceWeight = Number(course.attendance_weight_pct ?? 0);
  if (attendanceWeight > 0 && course.format === 'sync') {
    const attendancePct = await getStudentAttendancePct(studentId, courseId);
    if (attendancePct != null) {
      grade += attendancePct * (attendanceWeight / 100);
    }
  }

  const computedGrade = Math.round(grade * 100) / 100;

  const { error } = await db.from('course_final_grades').upsert(
    {
      student_id: studentId,
      course_id: courseId,
      computed_grade: computedGrade,
      pass_status: 'pending',
      updated_at: now,
    },
    { onConflict: 'student_id,course_id' },
  );

  if (error) throw new Error(error.message);
  return computedGrade;
}

export async function getStudentFinalGrade(
  studentId: string,
  courseId: string,
): Promise<CourseFinalGrade | null> {
  const db = getSupabaseServiceClient();
  const { data, error } = await db
    .from('course_final_grades')
    .select('*')
    .eq('student_id', studentId)
    .eq('course_id', courseId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data) return null;
  return {
    ...(data as CourseFinalGrade),
    pass_status: (data.pass_status as CourseFinalGrade['pass_status']) ?? 'pending',
  };
}

export async function getInstructorCourseMetrics(
  instructorId: string,
  courseId: string,
): Promise<InstructorCourseMetrics> {
  const course = await assertCourseInstructor(courseId, instructorId);

  const db = getSupabaseServiceClient();

  const { data: enrollments } = await db
    .from('course_enrollments')
    .select('student_id, status')
    .eq('course_id', courseId)
    .in('status', ['active', 'payment_overdue', 'completed']);

  const studentIds = (enrollments ?? []).map((e) => e.student_id as string);
  const enrolledStudents = studentIds.length;

  const { data: exams } = await db.from('course_exams').select('id').eq('course_id', courseId);
  const { data: assignments } = await db
    .from('course_assignments')
    .select('id')
    .eq('course_id', courseId);

  const examIds = (exams ?? []).map((e) => e.id);
  const assignmentIds = (assignments ?? []).map((a) => a.id);

  let pendingGrading = 0;
  if (examIds.length) {
    const { count } = await db
      .from('course_exam_submissions')
      .select('id', { count: 'exact', head: true })
      .in('exam_id', examIds)
      .eq('status', 'submitted');
    pendingGrading += count ?? 0;
  }
  if (assignmentIds.length) {
    const { count } = await db
      .from('course_assignment_submissions')
      .select('id', { count: 'exact', head: true })
      .in('assignment_id', assignmentIds)
      .eq('status', 'submitted');
    pendingGrading += count ?? 0;
  }

  const { data: grades } = await db
    .from('course_final_grades')
    .select('computed_grade')
    .eq('course_id', courseId)
    .not('computed_grade', 'is', null);

  const averageGrade =
    grades?.length
      ? Math.round(
          (grades.reduce((s, g) => s + Number(g.computed_grade), 0) / grades.length) * 100,
        ) / 100
      : null;

  let attendanceRate: number | null = null;
  if (course.format === 'sync' && studentIds.length) {
    const { data: cohorts } = await db
      .from('course_cohorts')
      .select('id')
      .eq('course_id', courseId);

    const cohortIds = (cohorts ?? []).map((c) => c.id);
    if (cohortIds.length) {
      const { data: sessions } = await db
        .from('course_live_sessions')
        .select('id')
        .in('cohort_id', cohortIds)
        .eq('status', 'completed');

      const sessionIds = (sessions ?? []).map((s) => s.id);
      if (sessionIds.length) {
        const { count: attended } = await db
          .from('course_attendance')
          .select('student_id', { count: 'exact', head: true })
          .in('live_session_id', sessionIds)
          .in('student_id', studentIds)
          .eq('attended', true);

        const possible = sessionIds.length * studentIds.length;
        attendanceRate =
          possible > 0 ? Math.round(((attended ?? 0) / possible) * 100) : null;
      }
    }
  }

  let progressSum = 0;
  let dropoutRiskCount = 0;

  for (const studentId of studentIds) {
    const enrollment = enrollments?.find((e) => e.student_id === studentId);
    const { progressPct: pct } = await computeEvaluationProgress(studentId, courseId);
    progressSum += pct;

    const atRisk =
      enrollment?.status === 'payment_overdue' ||
      (pct > 0 && pct < 25) ||
      (attendanceRate != null && attendanceRate < 50);
    if (atRisk) dropoutRiskCount += 1;
  }

  const averageProgressPct =
    enrolledStudents > 0 ? Math.round(progressSum / enrolledStudents) : null;

  return {
    pendingGrading,
    averageGrade,
    attendanceRate,
    dropoutRiskCount,
    averageProgressPct,
    enrolledStudents,
  };
}

export async function listCourseStudentGrades(courseId: string) {
  const db = getSupabaseServiceClient();
  const { data: enrollments, error } = await db
    .from('course_enrollments')
    .select(
      `
      student_id,
      status,
      student:course_student_profiles(full_name)
    `,
    )
    .eq('course_id', courseId)
    .in('status', ['active', 'completed', 'payment_overdue']);

  if (error) throw new Error(error.message);

  const rows = await Promise.all(
    (enrollments ?? []).map(async (enr) => {
      const grade = await getStudentFinalGrade(enr.student_id as string, courseId);
      const raw = enr.student as { full_name: string | null } | { full_name: string | null }[] | null;
      const student = Array.isArray(raw) ? raw[0] : raw;
      return {
        student_id: enr.student_id as string,
        full_name: student?.full_name ?? 'Alumno',
        pass_status: grade?.pass_status ?? 'pending',
        computed_grade: grade?.computed_grade ?? null,
      };
    }),
  );

  return rows;
}
