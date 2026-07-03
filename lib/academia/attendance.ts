import { getSupabaseServiceClient } from '@/lib/supabase';
import { assertCourseInstructor } from '@/lib/academia/course-instructors';
import { getCourseById } from '@/lib/academia/courses';
import { formatCohortSchedule, getLiveSessionById } from '@/lib/academia/cohorts';
import type {
  AttendanceSheetRow,
  CourseAttendanceReport,
  CourseCohort,
  CourseLiveSession,
} from '@/lib/academia/types';

const ACTIVE_ENROLLMENT_STATUSES = ['active', 'payment_overdue', 'paused'] as const;

async function getSessionContext(sessionId: string) {
  const db = getSupabaseServiceClient();
  const { data, error } = await db
    .from('course_live_sessions')
    .select('*, cohort:course_cohorts(*)')
    .eq('id', sessionId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data) throw new Error('Sesión no encontrada');

  const cohort = data.cohort as CourseCohort;
  const session = data as CourseLiveSession & { cohort: CourseCohort };
  return { session, cohort, courseId: cohort.course_id };
}

async function assertInstructorOwnsSession(instructorId: string, sessionId: string) {
  const { courseId } = await getSessionContext(sessionId);
  await assertCourseInstructor(courseId, instructorId);
  return courseId;
}

async function listCohortStudents(cohortId: string) {
  const db = getSupabaseServiceClient();
  const { data, error } = await db
    .from('course_enrollments')
    .select(
      `
      student_id,
      student:course_student_profiles(full_name)
    `,
    )
    .eq('cohort_id', cohortId)
    .in('status', [...ACTIVE_ENROLLMENT_STATUSES])
    .order('student_id');

  if (error) throw new Error(error.message);

  return (data ?? []).map((row) => {
    const raw = row.student as { full_name: string | null } | { full_name: string | null }[] | null;
    const profile = Array.isArray(raw) ? raw[0] : raw;
    return {
      student_id: row.student_id as string,
      full_name: profile?.full_name?.trim() || 'Alumno',
    };
  });
}

export async function getSessionAttendanceSheet(
  sessionId: string,
  options?: { instructorId?: string; allowAdmin?: boolean },
): Promise<{
  session: CourseLiveSession;
  cohort: CourseCohort;
  course_id: string;
  rows: AttendanceSheetRow[];
}> {
  const { session, cohort, courseId } = await getSessionContext(sessionId);

  if (options?.instructorId) {
    await assertInstructorOwnsSession(options.instructorId, sessionId);
  } else if (!options?.allowAdmin) {
    throw new Error('No autorizado');
  }

  const students = await listCohortStudents(cohort.id);
  const db = getSupabaseServiceClient();
  const { data: records, error } = await db
    .from('course_attendance')
    .select('student_id, attended, joined_at')
    .eq('live_session_id', sessionId);

  if (error) throw new Error(error.message);

  const byStudent = new Map(
    (records ?? []).map((r) => [
      r.student_id as string,
      { attended: Boolean(r.attended), joined_at: (r.joined_at as string | null) ?? null },
    ]),
  );

  const rows: AttendanceSheetRow[] = students.map((s) => {
    const rec = byStudent.get(s.student_id);
    return {
      student_id: s.student_id,
      full_name: s.full_name,
      attended: rec?.attended ?? false,
      joined_at: rec?.joined_at ?? null,
    };
  });

  return { session, cohort, course_id: courseId, rows };
}

export async function setSessionAttendance(
  instructorId: string,
  sessionId: string,
  entries: { student_id: string; attended: boolean }[],
) {
  await assertInstructorOwnsSession(instructorId, sessionId);
  const liveSession = await getLiveSessionById(sessionId);
  if (!liveSession) throw new Error('Sesión no encontrada');

  const db = getSupabaseServiceClient();
  const now = new Date().toISOString();

  const payload = entries.map((e) => ({
    student_id: e.student_id,
    live_session_id: sessionId,
    attended: e.attended,
    joined_at: e.attended ? now : null,
  }));

  if (payload.length) {
    const { error } = await db.from('course_attendance').upsert(payload, {
      onConflict: 'student_id,live_session_id',
    });
    if (error) throw new Error(error.message);
  }

  const scheduled = new Date(liveSession.scheduled_at).getTime();
  if (Date.now() >= scheduled && liveSession.status === 'scheduled') {
    await db.from('course_live_sessions').update({ status: 'completed' }).eq('id', sessionId);
  }

  return getSessionAttendanceSheet(sessionId, { instructorId });
}

function cohortLabel(cohort: CourseCohort) {
  const start = new Date(cohort.start_date).toLocaleDateString('es-MX', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
  const end = new Date(cohort.end_date).toLocaleDateString('es-MX', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
  return `${start} – ${end} · ${formatCohortSchedule(cohort)}`;
}

export async function getCourseAttendanceReport(courseId: string): Promise<CourseAttendanceReport> {
  const course = await getCourseById(courseId);
  if (!course) throw new Error('Curso no encontrado');
  if (course.format !== 'sync') {
    return { course_id: courseId, cohorts: [] };
  }

  const db = getSupabaseServiceClient();
  const { data: cohorts, error: cohortErr } = await db
    .from('course_cohorts')
    .select('*')
    .eq('course_id', courseId)
    .order('start_date', { ascending: true });

  if (cohortErr) throw new Error(cohortErr.message);

  const reportCohorts = await Promise.all(
    (cohorts ?? []).map(async (cohortRow) => {
      const cohort = cohortRow as CourseCohort;
      const students = await listCohortStudents(cohort.id);

      const { data: sessions, error: sesErr } = await db
        .from('course_live_sessions')
        .select('*')
        .eq('cohort_id', cohort.id)
        .neq('status', 'cancelled')
        .order('scheduled_at', { ascending: true });

      if (sesErr) throw new Error(sesErr.message);

      const sessionList = (sessions ?? []) as CourseLiveSession[];
      const sessionIds = sessionList.map((s) => s.id);

      let records: { student_id: string; live_session_id: string; attended: boolean }[] = [];
      if (sessionIds.length) {
        const { data: att, error: attErr } = await db
          .from('course_attendance')
          .select('student_id, live_session_id, attended')
          .in('live_session_id', sessionIds);

        if (attErr) throw new Error(attErr.message);
        records = (att ?? []) as typeof records;
      }

      const matrix: Record<string, Record<string, boolean>> = {};
      for (const s of students) {
        matrix[s.student_id] = {};
        for (const ses of sessionList) {
          matrix[s.student_id][ses.id] = false;
        }
      }
      for (const r of records) {
        if (matrix[r.student_id]) {
          matrix[r.student_id][r.live_session_id] = Boolean(r.attended);
        }
      }

      const student_totals: Record<string, { attended: number; total: number; pct: number }> = {};
      for (const s of students) {
        const row = matrix[s.student_id] ?? {};
        const total = sessionList.length;
        const attended = Object.values(row).filter(Boolean).length;
        student_totals[s.student_id] = {
          attended,
          total,
          pct: total ? Math.round((attended / total) * 100) : 0,
        };
      }

      const sessionSummaries = sessionList.map((ses) => {
        const present = students.filter((s) => matrix[s.student_id]?.[ses.id]).length;
        const total = students.length;
        return {
          session_id: ses.id,
          scheduled_at: ses.scheduled_at,
          status: ses.status,
          present_count: present,
          total_students: total,
          attendance_pct: total ? Math.round((present / total) * 100) : 0,
        };
      });

      return {
        cohort_id: cohort.id,
        label: cohortLabel(cohort),
        start_date: cohort.start_date,
        end_date: cohort.end_date,
        students,
        sessions: sessionSummaries,
        matrix,
        student_totals,
      };
    }),
  );

  return { course_id: courseId, cohorts: reportCohorts };
}
