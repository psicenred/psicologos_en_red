import { getSupabaseServiceClient } from '@/lib/supabase';
import { setCourseInstructors } from '@/lib/academia/course-instructors';
import type { Course, CourseWithInstructor, ModuleWithLessons, CourseGradingMode } from '@/lib/academia/types';
import { slugifyTitle } from '@/lib/academia/utils';

export async function listPublishedCourses(): Promise<CourseWithInstructor[]> {
  const db = getSupabaseServiceClient();
  const { data, error } = await db
    .from('course_courses')
    .select(
      `
      *,
      instructor:course_instructor_profiles(full_name, bio, status)
    `,
    )
    .eq('status', 'published')
    .order('created_at', { ascending: false });

  if (error) throw new Error(error.message);
  return (data ?? []) as CourseWithInstructor[];
}

export async function getPublishedCourseBySlug(
  slug: string,
): Promise<CourseWithInstructor | null> {
  const db = getSupabaseServiceClient();
  const { data, error } = await db
    .from('course_courses')
    .select(
      `
      *,
      instructor:course_instructor_profiles(full_name, bio, status)
    `,
    )
    .eq('slug', slug)
    .eq('status', 'published')
    .maybeSingle();

  if (error) throw new Error(error.message);
  return (data as CourseWithInstructor | null) ?? null;
}

export async function listInstructorCourses(instructorId: string): Promise<Course[]> {
  const db = getSupabaseServiceClient();
  const { data: assignments, error: assignError } = await db
    .from('course_course_instructors')
    .select('course_id')
    .eq('instructor_id', instructorId);

  if (assignError) {
    const { data, error } = await db
      .from('course_courses')
      .select('*')
      .eq('instructor_id', instructorId)
      .order('created_at', { ascending: false });
    if (error) throw new Error(error.message);
    return (data ?? []) as Course[];
  }

  const courseIds = [...new Set((assignments ?? []).map((row) => row.course_id as string))];
  if (courseIds.length === 0) {
    const { data, error } = await db
      .from('course_courses')
      .select('*')
      .eq('instructor_id', instructorId)
      .order('created_at', { ascending: false });
    if (error) throw new Error(error.message);
    return (data ?? []) as Course[];
  }

  const { data, error } = await db
    .from('course_courses')
    .select('*')
    .in('id', courseIds)
    .order('created_at', { ascending: false });

  if (error) throw new Error(error.message);
  return (data ?? []) as Course[];
}

export async function getCourseById(courseId: string): Promise<Course | null> {
  const db = getSupabaseServiceClient();
  const { data, error } = await db
    .from('course_courses')
    .select('*')
    .eq('id', courseId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return (data as Course | null) ?? null;
}

export async function getCourseModulesWithLessons(
  courseId: string,
): Promise<ModuleWithLessons[]> {
  const db = getSupabaseServiceClient();
  const { data: modules, error: modErr } = await db
    .from('course_modules')
    .select('*')
    .eq('course_id', courseId)
    .order('order_index', { ascending: true });

  if (modErr) throw new Error(modErr.message);
  if (!modules?.length) return [];

  const moduleIds = modules.map((m) => m.id);
  const { data: lessons, error: lesErr } = await db
    .from('course_lessons')
    .select('*')
    .in('module_id', moduleIds)
    .order('order_index', { ascending: true });

  if (lesErr) throw new Error(lesErr.message);

  return modules.map((mod) => ({
    ...(mod as ModuleWithLessons),
    lessons: (lessons ?? []).filter((l) => l.module_id === mod.id),
  }));
}

export async function ensureUniqueSlug(
  title: string,
  excludeId?: string,
): Promise<string> {
  const db = getSupabaseServiceClient();
  let base = slugifyTitle(title) || 'curso';
  let slug = base;
  let n = 1;

  while (true) {
    let query = db.from('course_courses').select('id').eq('slug', slug);
    if (excludeId) query = query.neq('id', excludeId);
    const { data } = await query.maybeSingle();
    if (!data) return slug;
    n += 1;
    slug = `${base}-${n}`;
  }
}

export type CourseInput = {
  title: string;
  description?: string;
  curriculum?: string;
  format: 'sync' | 'async';
  status: 'draft' | 'published' | 'archived';
  price_full?: number | null;
  price_monthly?: number | null;
  duration_months?: number;
  category?: string;
  level?: string;
  thumbnail_url?: string;
  grading_mode?: CourseGradingMode;
  attendance_weight_pct?: number;
};

export async function listAllCourses(): Promise<CourseWithInstructor[]> {
  const db = getSupabaseServiceClient();
  const { data, error } = await db
    .from('course_courses')
    .select(
      `
      *,
      instructor:course_instructor_profiles(id, full_name, bio, status)
    `,
    )
    .order('created_at', { ascending: false });

  if (error) throw new Error(error.message);
  return (data ?? []) as CourseWithInstructor[];
}

export async function listAssignableInstructors() {
  const db = getSupabaseServiceClient();
  const { data, error } = await db
    .from('course_instructor_profiles')
    .select('id, full_name, status')
    .in('status', ['approved', 'pending'])
    .order('full_name', { ascending: true });

  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function createCourse(
  instructorIds: string[],
  input: CourseInput,
): Promise<Course> {
  const uniqueIds = [...new Set(instructorIds.filter(Boolean))];
  if (uniqueIds.length === 0) {
    throw new Error('Debes asignar al menos un instructor');
  }

  const db = getSupabaseServiceClient();
  const slug = await ensureUniqueSlug(input.title);

  const { data, error } = await db
    .from('course_courses')
    .insert({
      instructor_id: uniqueIds[0],
      slug,
      title: input.title,
      description: input.description ?? null,
      curriculum: input.curriculum ?? null,
      format: input.format,
      status: input.status,
      price_full: input.price_full ?? null,
      price_monthly: input.price_monthly ?? null,
      duration_months: input.duration_months ?? 1,
      category: input.category ?? null,
      level: input.level ?? null,
      thumbnail_url: input.thumbnail_url ?? null,
    })
    .select('*')
    .single();

  if (error) throw new Error(error.message);

  const course = data as Course;
  await setCourseInstructors(course.id, uniqueIds, uniqueIds[0]);
  return course;
}

export async function updateCourse(
  courseId: string,
  input: Partial<CourseInput> & {
    title?: string;
    instructor_id?: string;
    instructor_ids?: string[];
  },
): Promise<Course> {
  const db = getSupabaseServiceClient();
  const existing = await getCourseById(courseId);
  if (!existing) {
    throw new Error('Curso no encontrado');
  }

  const updates: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(input)) {
    if (
      value !== undefined &&
      key !== 'instructor_ids' &&
      key !== 'primary_instructor_id'
    ) {
      updates[key] = value;
    }
  }
  if (input.title && input.title !== existing.title) {
    updates.slug = await ensureUniqueSlug(input.title, courseId);
  }

  const { data, error } = await db
    .from('course_courses')
    .update(updates)
    .eq('id', courseId)
    .select('*')
    .single();

  if (error) throw new Error(error.message);

  if (input.instructor_ids?.length) {
    await setCourseInstructors(
      courseId,
      input.instructor_ids,
      input.instructor_id ?? input.instructor_ids[0],
    );
  } else if (input.instructor_id) {
    await setCourseInstructors(courseId, [input.instructor_id], input.instructor_id);
  }

  return data as Course;
}

export async function deleteCourse(courseId: string): Promise<void> {
  const db = getSupabaseServiceClient();
  const existing = await getCourseById(courseId);
  if (!existing) {
    throw new Error('Curso no encontrado');
  }

  const { error } = await db.from('course_courses').delete().eq('id', courseId);
  if (error) throw new Error(error.message);
}

/** Operaciones de contenido (solo admin vía API). */
export async function adminUpsertModule(
  courseId: string,
  module: { id?: string; title: string; order_index: number },
): Promise<string> {
  if (!(await getCourseById(courseId))) throw new Error('Curso no encontrado');
  const db = getSupabaseServiceClient();
  if (module.id) {
    const { error } = await db
      .from('course_modules')
      .update({ title: module.title, order_index: module.order_index })
      .eq('id', module.id)
      .eq('course_id', courseId);
    if (error) throw new Error(error.message);
    return module.id;
  }
  const { data, error } = await db
    .from('course_modules')
    .insert({ course_id: courseId, title: module.title, order_index: module.order_index })
    .select('id')
    .single();
  if (error) throw new Error(error.message);
  return data.id as string;
}

export async function adminUpsertLesson(
  moduleId: string,
  lesson: {
    id?: string;
    title: string;
    content_type: 'video' | 'pdf' | 'text' | 'live_link';
    text_content?: string;
    video_url?: string;
    pdf_url?: string;
    order_index: number;
  },
): Promise<string> {
  const db = getSupabaseServiceClient();
  const { data: mod } = await db
    .from('course_modules')
    .select('course_id')
    .eq('id', moduleId)
    .single();
  if (!mod) throw new Error('Módulo no encontrado');

  const payload = {
    title: lesson.title,
    content_type: lesson.content_type,
    text_content: lesson.text_content ?? null,
    video_url: lesson.video_url ?? null,
    pdf_url: lesson.pdf_url ?? null,
    order_index: lesson.order_index,
  };

  if (lesson.id) {
    const { error } = await db.from('course_lessons').update(payload).eq('id', lesson.id);
    if (error) throw new Error(error.message);
    return lesson.id;
  }

  const { data, error } = await db
    .from('course_lessons')
    .insert({ ...payload, module_id: moduleId })
    .select('id')
    .single();
  if (error) throw new Error(error.message);
  return data.id as string;
}

export async function adminDeleteModule(moduleId: string) {
  const db = getSupabaseServiceClient();
  const { error } = await db.from('course_modules').delete().eq('id', moduleId);
  if (error) throw new Error(error.message);
}

export async function adminDeleteLesson(lessonId: string) {
  const db = getSupabaseServiceClient();
  const { error } = await db.from('course_lessons').delete().eq('id', lessonId);
  if (error) throw new Error(error.message);
}
