import { NextResponse } from 'next/server';
import { getAcademiaSession } from '@/lib/academia/auth';
import { createCohortWithSessions, getLiveSessionsForCohort, listCohortsForCourse } from '@/lib/academia/cohorts';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ courseId: string }> },
) {
  const session = await getAcademiaSession();
  if (!session || session.role !== 'admin') {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
  }

  const { courseId } = await params;
  const cohorts = await listCohortsForCourse(courseId);
  const withSessions = await Promise.all(
    cohorts.map(async (cohort) => ({
      ...cohort,
      sessions: await getLiveSessionsForCohort(cohort.id),
    })),
  );
  return NextResponse.json({ cohorts: withSessions });
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ courseId: string }> },
) {
  const session = await getAcademiaSession();
  if (!session || session.role !== 'admin') {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
  }

  const { courseId } = await params;
  const body = await request.json();

  try {
    const cohort = await createCohortWithSessions({
      course_id: courseId,
      start_date: String(body.start_date),
      end_date: String(body.end_date),
      live_session_weekday: Number(body.live_session_weekday ?? 0),
      live_session_time: String(body.live_session_time ?? '18:00'),
      timezone: body.timezone,
    });

    return NextResponse.json({ cohort });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 400 });
  }
}
