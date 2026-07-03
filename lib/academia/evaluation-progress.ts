import { getSupabaseServiceClient } from '@/lib/supabase';
import { listAssignmentsForCourse } from '@/lib/academia/assignments';
import { listExamsForCourse } from '@/lib/academia/exams';
import type { CourseAssignment, CourseExam } from '@/lib/academia/types';

export async function getCourseEvaluations(courseId: string): Promise<{
  exams: CourseExam[];
  assignments: CourseAssignment[];
}> {
  const [exams, assignments] = await Promise.all([
    listExamsForCourse(courseId),
    listAssignmentsForCourse(courseId),
  ]);
  return { exams, assignments };
}

export async function computeEvaluationProgress(
  studentId: string,
  courseId: string,
): Promise<{ progressPct: number; completed: number; total: number }> {
  const db = getSupabaseServiceClient();
  const { exams, assignments } = await getCourseEvaluations(courseId);

  const weighted = [
    ...exams.filter((e) => Number(e.weight_pct) > 0),
    ...assignments.filter((a) => Number(a.weight_pct) > 0),
  ];

  if (weighted.length === 0) {
    return { progressPct: 0, completed: 0, total: 0 };
  }

  let completed = 0;

  for (const exam of exams) {
    if (Number(exam.weight_pct) <= 0) continue;
    const { data: sub } = await db
      .from('course_exam_submissions')
      .select('status, final_score')
      .eq('exam_id', exam.id)
      .eq('student_id', studentId)
      .maybeSingle();
    if (sub?.status === 'released' && sub.final_score != null) completed += 1;
  }

  for (const assignment of assignments) {
    if (Number(assignment.weight_pct) <= 0) continue;
    const { data: sub } = await db
      .from('course_assignment_submissions')
      .select('status, final_score')
      .eq('assignment_id', assignment.id)
      .eq('student_id', studentId)
      .maybeSingle();
    if (sub?.status === 'graded' && sub.final_score != null) completed += 1;
  }

  const total = weighted.length;
  const progressPct = total > 0 ? Math.round((completed / total) * 100) : 0;
  return { progressPct, completed, total };
}
