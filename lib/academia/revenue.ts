import { getSupabaseServiceClient } from '@/lib/supabase';
import { listInstructorCourses } from '@/lib/academia/courses';
import type { InstructorRevenueLine, InstructorRevenueReport } from '@/lib/academia/types';

export async function getInstructorRevenueReport(
  instructorId: string,
): Promise<InstructorRevenueReport> {
  const db = getSupabaseServiceClient();

  const { data: profile } = await db
    .from('course_instructor_profiles')
    .select('revenue_share_pct')
    .eq('id', instructorId)
    .maybeSingle();

  const sharePct = Number(profile?.revenue_share_pct ?? 70);
  const courses = await listInstructorCourses(instructorId);
  const lines: InstructorRevenueLine[] = [];

  for (const course of courses) {
    const { data: enrollments } = await db
      .from('course_enrollments')
      .select('id')
      .eq('course_id', course.id);

    const enrollmentIds = (enrollments ?? []).map((e) => e.id);
    if (!enrollmentIds.length) {
      lines.push({
        course_id: course.id,
        course_title: course.title,
        gross_mxn: 0,
        instructor_share_mxn: 0,
        revenue_share_pct: sharePct,
        paid_payments_count: 0,
      });
      continue;
    }

    const { data: payments } = await db
      .from('course_payments')
      .select('amount')
      .in('enrollment_id', enrollmentIds)
      .eq('status', 'paid');

    const gross = (payments ?? []).reduce((s, p) => s + Number(p.amount), 0);
    const instructorShare = Math.round(gross * (sharePct / 100) * 100) / 100;

    lines.push({
      course_id: course.id,
      course_title: course.title,
      gross_mxn: gross,
      instructor_share_mxn: instructorShare,
      revenue_share_pct: sharePct,
      paid_payments_count: payments?.length ?? 0,
    });
  }

  const total_gross_mxn = lines.reduce((s, l) => s + l.gross_mxn, 0);
  const total_instructor_share_mxn = lines.reduce((s, l) => s + l.instructor_share_mxn, 0);

  return {
    total_gross_mxn,
    total_instructor_share_mxn,
    revenue_share_pct: sharePct,
    lines,
  };
}

export async function getInstructorRevenueForCourse(instructorId: string, courseId: string) {
  const report = await getInstructorRevenueReport(instructorId);
  const line = report.lines.find((l) => l.course_id === courseId);
  if (!line) throw new Error('Curso no encontrado');
  return line;
}
