import { listAssignmentsForCourse, getAssignmentById } from '@/lib/academia/assignments';
import { assertCourseInstructor } from '@/lib/academia/course-instructors';
import { listExamsForCourse } from '@/lib/academia/exams';
import { getSupabaseServiceClient } from '@/lib/supabase';

export type ReviewSubmissionListItem = {
  id: string;
  student_id: string;
  student_name: string;
  submitted_at: string;
  status: string;
  final_score: number | null;
  is_late?: boolean;
};

export type ReviewEvaluationItem = {
  type: 'exam' | 'assignment';
  id: string;
  title: string;
  submissions: ReviewSubmissionListItem[];
};

export async function listCourseSubmissionsForReview(
  courseId: string,
  instructorId: string,
): Promise<ReviewEvaluationItem[]> {
  await assertCourseInstructor(courseId, instructorId);
  const db = getSupabaseServiceClient();

  const [exams, assignments] = await Promise.all([
    listExamsForCourse(courseId),
    listAssignmentsForCourse(courseId),
  ]);

  const examIds = exams.map((e) => e.id);
  const assignmentIds = assignments.map((a) => a.id);

  const [examSubs, assignmentSubs] = await Promise.all([
    examIds.length
      ? db
          .from('course_exam_submissions')
          .select('id, exam_id, student_id, submitted_at, status, final_score, student:course_student_profiles(full_name)')
          .in('exam_id', examIds)
          .order('submitted_at', { ascending: false })
      : Promise.resolve({ data: [] }),
    assignmentIds.length
      ? db
          .from('course_assignment_submissions')
          .select('id, assignment_id, student_id, submitted_at, status, final_score, is_late, student:course_student_profiles(full_name)')
          .in('assignment_id', assignmentIds)
          .order('submitted_at', { ascending: false })
      : Promise.resolve({ data: [] }),
  ]);

  type Row = {
    id: string;
    exam_id?: string;
    assignment_id?: string;
    student_id: string;
    submitted_at: string;
    status: string;
    final_score: number | null;
    is_late?: boolean;
    student?: { full_name?: string } | { full_name?: string }[] | null;
  };

  function studentName(row: Row): string {
    const s = row.student;
    if (Array.isArray(s)) return s[0]?.full_name ?? 'Alumno';
    return s?.full_name ?? 'Alumno';
  }

  const items: ReviewEvaluationItem[] = [];

  for (const exam of exams) {
    const subs = ((examSubs.data ?? []) as Row[]).filter((s) => s.exam_id === exam.id);
    items.push({
      type: 'exam',
      id: exam.id,
      title: exam.title,
      submissions: subs.map((s) => ({
        id: s.id,
        student_id: s.student_id,
        student_name: studentName(s),
        submitted_at: s.submitted_at,
        status: s.status,
        final_score: s.final_score,
      })),
    });
  }

  for (const assignment of assignments) {
    const subs = ((assignmentSubs.data ?? []) as Row[]).filter(
      (s) => s.assignment_id === assignment.id,
    );
    items.push({
      type: 'assignment',
      id: assignment.id,
      title: assignment.title,
      submissions: subs.map((s) => ({
        id: s.id,
        student_id: s.student_id,
        student_name: studentName(s),
        submitted_at: s.submitted_at,
        status: s.status,
        final_score: s.final_score,
        is_late: s.is_late,
      })),
    });
  }

  return items;
}

export async function getAssignmentSubmissionDetail(
  submissionId: string,
  viewerRole: 'student' | 'instructor',
  viewerId: string,
) {
  const db = getSupabaseServiceClient();
  const { data: submission, error } = await db
    .from('course_assignment_submissions')
    .select(
      `
      *,
      student:course_student_profiles(id, full_name),
      assignment:course_assignments(*)
    `,
    )
    .eq('id', submissionId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!submission) return null;

  const assignment = submission.assignment as {
    course_id: string;
    title: string;
    instructions: string | null;
    rubric: string | null;
    due_date: string;
    late_penalty_pct_per_day: number;
  };

  if (viewerRole === 'student' && submission.student_id !== viewerId) {
    throw new Error('No autorizado');
  }

  if (viewerRole === 'instructor') {
    await assertCourseInstructor(assignment.course_id, viewerId);
  }

  const student = submission.student as { id: string; full_name: string } | null;

  return {
    submission,
    assignment,
    student,
  };
}

export async function assertCanReadAssignmentFile(
  submissionId: string,
  fileIndex: number,
  viewerRole: 'student' | 'instructor',
  viewerId: string,
): Promise<{ storedPath: string; fileName: string }> {
  const detail = await getAssignmentSubmissionDetail(submissionId, viewerRole, viewerId);
  if (!detail) throw new Error('Entrega no encontrada');

  const urls = (detail.submission.file_urls ?? []) as string[];
  if (fileIndex < 0 || fileIndex >= urls.length) {
    throw new Error('Archivo no encontrado');
  }

  const storedPath = urls[fileIndex];
  const assignment = await getAssignmentById(detail.submission.assignment_id as string);
  const fileName = `${assignment?.title ?? 'entrega'}-${fileIndex + 1}.pdf`;

  return { storedPath, fileName };
}
