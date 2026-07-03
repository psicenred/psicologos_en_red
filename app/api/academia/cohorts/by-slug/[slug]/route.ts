import { NextResponse } from 'next/server';
import { listUpcomingCohortsForCourse, formatCohortSchedule, formatCohortEnrollmentLabel, formatCohortStartLabel } from '@/lib/academia/cohorts';
import { getPublishedCourseBySlug } from '@/lib/academia/courses';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const course = await getPublishedCourseBySlug(slug);
  if (!course || course.format !== 'sync') {
    return NextResponse.json({ cohorts: [] });
  }

  const cohorts = await listUpcomingCohortsForCourse(course.id);
  return NextResponse.json({
    courseTitle: course.title,
    cohorts: cohorts.map((c) => ({
      ...c,
      schedule_label: formatCohortSchedule(c),
      start_label: formatCohortStartLabel(c.start_date),
      enrollment_label: formatCohortEnrollmentLabel(c, course.title),
    })),
  });
}
