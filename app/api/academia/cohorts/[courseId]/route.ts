import { NextResponse } from 'next/server';
import { getAcademiaSession } from '@/lib/academia/auth';
import { listUpcomingCohortsForCourse, formatCohortSchedule } from '@/lib/academia/cohorts';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ courseId: string }> },
) {
  const { courseId } = await params;
  const cohorts = await listUpcomingCohortsForCourse(courseId);

  return NextResponse.json({
    cohorts: cohorts.map((c) => ({
      ...c,
      schedule_label: formatCohortSchedule(c),
    })),
  });
}
