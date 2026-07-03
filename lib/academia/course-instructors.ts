import { getSupabaseServiceClient } from '@/lib/supabase';
import { getCourseById } from '@/lib/academia/courses';

export async function isCourseInstructor(
  courseId: string,
  instructorId: string,
): Promise<boolean> {
  const db = getSupabaseServiceClient();
  const { data, error } = await db
    .from('course_course_instructors')
    .select('instructor_id')
    .eq('course_id', courseId)
    .eq('instructor_id', instructorId)
    .maybeSingle();

  if (error) {
    const course = await getCourseById(courseId);
    return course?.instructor_id === instructorId;
  }

  if (data) return true;

  const course = await getCourseById(courseId);
  return course?.instructor_id === instructorId;
}

export async function assertCourseInstructor(courseId: string, instructorId: string) {
  if (!(await isCourseInstructor(courseId, instructorId))) {
    throw new Error('Curso no encontrado');
  }
  const course = await getCourseById(courseId);
  if (!course) throw new Error('Curso no encontrado');
  return course;
}

export async function getCourseInstructorIds(courseId: string): Promise<string[]> {
  const db = getSupabaseServiceClient();
  const { data, error } = await db
    .from('course_course_instructors')
    .select('instructor_id, is_primary')
    .eq('course_id', courseId)
    .order('is_primary', { ascending: false });

  if (error || !data?.length) {
    const course = await getCourseById(courseId);
    return course?.instructor_id ? [course.instructor_id] : [];
  }

  return data.map((row) => row.instructor_id as string);
}

export async function setCourseInstructors(
  courseId: string,
  instructorIds: string[],
  primaryInstructorId?: string,
): Promise<void> {
  const uniqueIds = [...new Set(instructorIds.filter(Boolean))];
  if (uniqueIds.length === 0) {
    throw new Error('Debes asignar al menos un instructor');
  }

  const primary = primaryInstructorId && uniqueIds.includes(primaryInstructorId)
    ? primaryInstructorId
    : uniqueIds[0];

  const db = getSupabaseServiceClient();
  const { error: updateError } = await db
    .from('course_courses')
    .update({ instructor_id: primary })
    .eq('id', courseId);

  if (updateError) throw new Error(updateError.message);

  const { error: deleteError } = await db
    .from('course_course_instructors')
    .delete()
    .eq('course_id', courseId);

  if (deleteError) throw new Error(deleteError.message);

  const { error: insertError } = await db.from('course_course_instructors').insert(
    uniqueIds.map((instructorId) => ({
      course_id: courseId,
      instructor_id: instructorId,
      is_primary: instructorId === primary,
    })),
  );

  if (insertError) throw new Error(insertError.message);
}
