import { getSupabaseServiceClient } from '@/lib/supabase';
import { assertCourseInstructor } from '@/lib/academia/course-instructors';
import {
  isAnnouncementVisibleToStudents,
} from '@/lib/academia/announcement-visibility';
import type { CourseAnnouncement, StudentAnnouncementFeedItem } from '@/lib/academia/types';

export async function listAnnouncementsForCourse(
  courseId: string,
): Promise<CourseAnnouncement[]> {
  const db = getSupabaseServiceClient();
  const { data, error } = await db
    .from('course_announcements')
    .select('*')
    .eq('course_id', courseId)
    .order('created_at', { ascending: false });

  if (error) throw new Error(error.message);
  return (data ?? []) as CourseAnnouncement[];
}

export async function listAnnouncementsForStudent(
  studentId: string,
  limit = 30,
): Promise<StudentAnnouncementFeedItem[]> {
  const db = getSupabaseServiceClient();

  const { data: enrollments, error: enrErr } = await db
    .from('course_enrollments')
    .select('course_id')
    .eq('student_id', studentId)
    .in('status', ['active', 'payment_overdue']);

  if (enrErr) throw new Error(enrErr.message);
  const courseIds = [...new Set((enrollments ?? []).map((e) => e.course_id))];
  if (courseIds.length === 0) return [];

  const { data, error } = await db
    .from('course_announcements')
    .select(
      `
      *,
      course:course_courses(title),
      instructor:course_instructor_profiles(full_name)
    `,
    )
    .in('course_id', courseIds)
    .order('created_at', { ascending: false })
    .limit(limit * 3);

  if (error) throw new Error(error.message);

  const now = new Date();

  return (data ?? [])
    .filter((row) =>
      isAnnouncementVisibleToStudents(
        {
          visible_from: row.visible_from,
          visible_until: row.visible_until,
          created_at: row.created_at,
        },
        now,
      ),
    )
    .slice(0, limit)
    .map((row) => {
      const course = row.course as { title: string } | null;
      const instructor = row.instructor as { full_name: string | null } | null;
      return {
        id: row.id,
        course_id: row.course_id,
        instructor_id: row.instructor_id,
        title: row.title,
        body: row.body,
        created_at: row.created_at,
        visible_from: row.visible_from,
        visible_until: row.visible_until,
        course_title: course?.title ?? 'Curso',
        instructor_name: instructor?.full_name ?? null,
      };
    });
}

export async function createAnnouncement(
  instructorId: string,
  courseId: string,
  title: string,
  body: string,
  options?: { visibleFrom?: string; visibleUntil?: string | null },
): Promise<CourseAnnouncement> {
  await assertCourseInstructor(courseId, instructorId);

  const trimmedTitle = title.trim();
  const trimmedBody = body.trim();
  if (!trimmedTitle) throw new Error('El título es obligatorio');
  if (!trimmedBody) throw new Error('El mensaje es obligatorio');

  const visibleFrom = options?.visibleFrom
    ? new Date(options.visibleFrom)
    : new Date();
  if (Number.isNaN(visibleFrom.getTime())) {
    throw new Error('Fecha de inicio no válida');
  }

  let visibleUntil: string | null = null;
  if (options?.visibleUntil) {
    const until = new Date(options.visibleUntil);
    if (Number.isNaN(until.getTime())) {
      throw new Error('Fecha de fin no válida');
    }
    if (until <= visibleFrom) {
      throw new Error('La fecha de fin debe ser posterior al inicio');
    }
    visibleUntil = until.toISOString();
  } else {
    throw new Error('La fecha de fin es obligatoria');
  }

  const db = getSupabaseServiceClient();
  const { data, error } = await db
    .from('course_announcements')
    .insert({
      course_id: courseId,
      instructor_id: instructorId,
      title: trimmedTitle,
      body: trimmedBody,
      visible_from: visibleFrom.toISOString(),
      visible_until: visibleUntil,
    })
    .select('*')
    .single();

  if (error) throw new Error(error.message);
  return data as CourseAnnouncement;
}

export async function deleteAnnouncement(
  instructorId: string,
  announcementId: string,
): Promise<void> {
  const db = getSupabaseServiceClient();
  const { data: announcement, error: fetchErr } = await db
    .from('course_announcements')
    .select('course_id')
    .eq('id', announcementId)
    .maybeSingle();

  if (fetchErr) throw new Error(fetchErr.message);
  if (!announcement) throw new Error('Aviso no encontrado');

  await assertCourseInstructor(announcement.course_id, instructorId);

  const { error } = await db.from('course_announcements').delete().eq('id', announcementId);
  if (error) throw new Error(error.message);
}
