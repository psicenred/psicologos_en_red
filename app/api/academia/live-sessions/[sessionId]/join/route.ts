import { NextResponse } from 'next/server';
import { getAcademiaSession } from '@/lib/academia/auth';
import { isCourseInstructor } from '@/lib/academia/course-instructors';
import { getLiveSessionById, recordAttendance } from '@/lib/academia/cohorts';
import { createCourseMeetingToken } from '@/lib/academia/daily';
import { getSupabaseServiceClient } from '@/lib/supabase';

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ sessionId: string }> },
) {
  const session = await getAcademiaSession();
  if (!session || (session.role !== 'student' && session.role !== 'instructor')) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
  }

  const { sessionId } = await params;
  const liveSession = await getLiveSessionById(sessionId);
  if (!liveSession?.daily_room_name || !liveSession.daily_room_url) {
    return NextResponse.json({ error: 'Sesión no disponible' }, { status: 404 });
  }

  const db = getSupabaseServiceClient();
  const { data: cohort } = await db
    .from('course_cohorts')
    .select('course_id')
    .eq('id', liveSession.cohort_id)
    .single();

  if (!cohort) {
    return NextResponse.json({ error: 'Cohorte no encontrada' }, { status: 404 });
  }

  const isInstructor = session.role === 'instructor';

  if (isInstructor) {
    if (!(await isCourseInstructor(cohort.course_id, session.userId))) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }
  } else {
    const { data: enrollment } = await db
      .from('course_enrollments')
      .select('status')
      .eq('student_id', session.userId)
      .eq('course_id', cohort.course_id)
      .eq('cohort_id', liveSession.cohort_id)
      .maybeSingle();

    if (!enrollment || enrollment.status !== 'active') {
      return NextResponse.json(
        { error: 'No tienes acceso activo a esta sesión en vivo' },
        { status: 403 },
      );
    }
  }

  const profileTable = isInstructor ? 'course_instructor_profiles' : 'course_student_profiles';
  const { data: profile } = await db
    .from(profileTable)
    .select('full_name')
    .eq('id', session.userId)
    .maybeSingle();

  const token = await createCourseMeetingToken({
    roomName: liveSession.daily_room_name,
    userId: session.userId,
    userName: profile?.full_name || session.email,
    isOwner: isInstructor,
  });

  if (!token) {
    return NextResponse.json({ error: 'No se pudo generar acceso a la videollamada' }, { status: 503 });
  }

  if (!isInstructor) {
    await recordAttendance(session.userId, sessionId);
  }

  return NextResponse.json({
    url: liveSession.daily_room_url,
    token,
  });
}
