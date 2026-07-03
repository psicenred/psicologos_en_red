import { getSupabaseServiceClient } from '@/lib/supabase';
import { isCourseInstructor, assertCourseInstructor } from '@/lib/academia/course-instructors';
import { createCourseLiveRoom } from '@/lib/academia/daily';
import type { CourseCohort, CourseLiveSession, CohortWithSessions } from '@/lib/academia/types';

const WEEKDAY_LABELS = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

export function formatCohortSchedule(cohort: CourseCohort): string {
  const day = WEEKDAY_LABELS[cohort.live_session_weekday] ?? '';
  const time = (cohort.live_session_time || '').slice(0, 5);
  return `${day} ${time} (${cohort.timezone})`;
}

export function formatCohortStartLabel(startDate: string): string {
  const d = parseDateOnly(startDate);
  return d.toLocaleDateString('es-MX', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

export function formatCohortEnrollmentLabel(cohort: CourseCohort, courseTitle?: string): string {
  const start = formatCohortStartLabel(cohort.start_date);
  const prefix = courseTitle ? `${courseTitle} — ` : '';
  return `${prefix}Inicia el ${start}`;
}

export async function getOpenEnrollmentCohort(courseId: string) {
  const cohorts = await listUpcomingCohortsForCourse(courseId);
  return cohorts[0] ?? null;
}

export async function resolveEnrollmentCohortId(
  courseId: string,
  cohortId?: string | null,
): Promise<string> {
  const open = await listUpcomingCohortsForCourse(courseId);
  if (!open.length) {
    throw new Error('No hay cohorte abierta para inscripción en este curso');
  }

  if (cohortId) {
    const match = open.find((c) => c.id === cohortId);
    if (!match) throw new Error('La cohorte seleccionada no está disponible');
    return cohortId;
  }

  if (open.length === 1) return open[0].id;

  throw new Error('Selecciona una cohorte');
}

export async function assertSingleCohortAllowed(courseId: string) {
  const cohorts = await listCohortsForCourse(courseId);
  if (cohorts.length > 0) {
    throw new Error(
      'Este curso ya tiene una cohorte. Por ahora solo se permite una cohorte por curso.',
    );
  }
}

function parseDateOnly(dateStr: string): Date {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(y, m - 1, d);
}

function combineDateAndTime(date: Date, timeStr: string): Date {
  const [hh, mm] = timeStr.split(':').map(Number);
  const combined = new Date(date);
  combined.setHours(hh, mm ?? 0, 0, 0);
  return combined;
}

export function buildSessionDates(cohort: {
  start_date: string;
  end_date: string;
  live_session_weekday: number;
  live_session_time: string;
}): Date[] {
  const dates: Date[] = [];
  const start = parseDateOnly(cohort.start_date);
  const end = parseDateOnly(cohort.end_date);
  const cursor = new Date(start);

  while (cursor <= end) {
    if (cursor.getDay() === cohort.live_session_weekday) {
      dates.push(combineDateAndTime(cursor, cohort.live_session_time));
    }
    cursor.setDate(cursor.getDate() + 1);
  }

  return dates;
}

export async function listCohortsForCourse(courseId: string): Promise<CohortWithSessions[]> {
  const db = getSupabaseServiceClient();
  const { data, error } = await db
    .from('course_cohorts')
    .select('*')
    .eq('course_id', courseId)
    .order('start_date', { ascending: true });

  if (error) throw new Error(error.message);
  return (data ?? []) as CohortWithSessions[];
}

export async function listUpcomingCohortsForCourse(courseId: string) {
  const cohorts = await listCohortsForCourse(courseId);
  const withCounts = await Promise.all(
    cohorts
      .filter((c) => c.status === 'upcoming' || c.status === 'active')
      .map(async (c) => ({
        ...c,
        enrollment_count: await countCohortEnrollments(c.id),
      })),
  );
  return withCounts;
}

export async function countCohortEnrollments(cohortId: string): Promise<number> {
  const db = getSupabaseServiceClient();
  const { count, error } = await db
    .from('course_enrollments')
    .select('id', { count: 'exact', head: true })
    .eq('cohort_id', cohortId)
    .in('status', ['active', 'payment_overdue', 'paused']);

  if (error) throw new Error(error.message);
  return count ?? 0;
}

export async function createCohortWithSessions(input: {
  course_id: string;
  start_date: string;
  end_date: string;
  live_session_weekday: number;
  live_session_time: string;
  timezone?: string;
}): Promise<CourseCohort> {
  await assertSingleCohortAllowed(input.course_id);

  const db = getSupabaseServiceClient();

  const { data: cohort, error } = await db
    .from('course_cohorts')
    .insert({
      course_id: input.course_id,
      start_date: input.start_date,
      end_date: input.end_date,
      live_session_weekday: input.live_session_weekday,
      live_session_time: input.live_session_time,
      timezone: input.timezone ?? 'America/Mexico_City',
      status: 'upcoming',
    })
    .select('*')
    .single();

  if (error) throw new Error(error.message);

  const sessionDates = buildSessionDates(cohort as CourseCohort);
  for (const scheduledAt of sessionDates) {
    const { data: session, error: sesErr } = await db
      .from('course_live_sessions')
      .insert({
        cohort_id: cohort.id,
        scheduled_at: scheduledAt.toISOString(),
        status: 'scheduled',
      })
      .select('id')
      .single();

    if (sesErr) throw new Error(sesErr.message);

    const room = await createCourseLiveRoom(session.id);
    if (room) {
      await db
        .from('course_live_sessions')
        .update({ daily_room_url: room.url, daily_room_name: room.name })
        .eq('id', session.id);
    }
  }

  return cohort as CourseCohort;
}

export async function getLiveSessionsForCohort(cohortId: string): Promise<CourseLiveSession[]> {
  const db = getSupabaseServiceClient();
  const { data, error } = await db
    .from('course_live_sessions')
    .select('*')
    .eq('cohort_id', cohortId)
    .order('scheduled_at', { ascending: true });

  if (error) throw new Error(error.message);
  return (data ?? []) as CourseLiveSession[];
}

export async function getStudentLiveSessions(studentId: string, courseId: string) {
  const db = getSupabaseServiceClient();
  const { data: enrollment } = await db
    .from('course_enrollments')
    .select('cohort_id, status')
    .eq('student_id', studentId)
    .eq('course_id', courseId)
    .maybeSingle();

  if (!enrollment?.cohort_id || enrollment.status !== 'active') {
    return { sessions: [], enrollmentStatus: enrollment?.status ?? null };
  }

  const sessions = await getLiveSessionsForCohort(enrollment.cohort_id);
  return { sessions, enrollmentStatus: enrollment.status };
}

export async function getLiveSessionById(sessionId: string): Promise<CourseLiveSession | null> {
  const db = getSupabaseServiceClient();
  const { data, error } = await db
    .from('course_live_sessions')
    .select('*')
    .eq('id', sessionId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return (data as CourseLiveSession | null) ?? null;
}

export async function updateLiveSessionScheduledAt(input: {
  sessionId: string;
  scheduledAt: string;
  instructorId?: string;
  asAdmin?: boolean;
}): Promise<CourseLiveSession> {
  const scheduledAt = new Date(input.scheduledAt);
  if (Number.isNaN(scheduledAt.getTime())) {
    throw new Error('Fecha de sesión inválida');
  }

  const liveSession = await getLiveSessionById(input.sessionId);
  if (!liveSession) throw new Error('Sesión no encontrada');

  const db = getSupabaseServiceClient();
  const { data: cohort, error: cohortError } = await db
    .from('course_cohorts')
    .select('course_id')
    .eq('id', liveSession.cohort_id)
    .maybeSingle();

  if (cohortError) throw new Error(cohortError.message);
  if (!cohort) throw new Error('Cohorte no encontrada');

  if (input.asAdmin) {
    // Admin puede editar cualquier sesión del curso.
  } else {
    if (!input.instructorId) throw new Error('No autorizado');
    await assertCourseInstructor(cohort.course_id as string, input.instructorId);
  }

  const { data, error } = await db
    .from('course_live_sessions')
    .update({ scheduled_at: scheduledAt.toISOString() })
    .eq('id', input.sessionId)
    .select('*')
    .single();

  if (error) throw new Error(error.message);
  return data as CourseLiveSession;
}

export async function getInstructorLiveSessions(instructorId: string, courseId: string) {
  const db = getSupabaseServiceClient();
  const { data: course } = await db
    .from('course_courses')
    .select('id, format')
    .eq('id', courseId)
    .maybeSingle();

  if (!course || course.format !== 'sync' || !(await isCourseInstructor(courseId, instructorId))) {
    return [];
  }

  const { data: cohorts } = await db
    .from('course_cohorts')
    .select('id')
    .eq('course_id', courseId);

  if (!cohorts?.length) return [];

  const cohortIds = cohorts.map((c) => c.id);
  const { data, error } = await db
    .from('course_live_sessions')
    .select('*')
    .in('cohort_id', cohortIds)
    .order('scheduled_at', { ascending: true });

  if (error) throw new Error(error.message);
  return (data ?? []) as CourseLiveSession[];
}

export async function recordAttendance(studentId: string, liveSessionId: string) {
  const db = getSupabaseServiceClient();
  const now = new Date().toISOString();

  const { error } = await db.from('course_attendance').upsert(
    {
      student_id: studentId,
      live_session_id: liveSessionId,
      attended: true,
      joined_at: now,
    },
    { onConflict: 'student_id,live_session_id' },
  );

  if (error) throw new Error(error.message);
}
