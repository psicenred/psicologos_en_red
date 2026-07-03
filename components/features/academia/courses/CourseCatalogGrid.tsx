import { listPublishedCourses } from '@/lib/academia/courses';
import { CourseCard } from '@/components/features/academia/courses/CourseCard';

export async function CourseCatalogGrid() {
  let courses: Awaited<ReturnType<typeof listPublishedCourses>> = [];
  let error: string | null = null;

  try {
    courses = await listPublishedCourses();
  } catch (e) {
    error = (e as Error).message;
  }

  if (error) {
    return (
      <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
        El catálogo de cursos no está disponible. Ejecuta la migración{' '}
        <code className="text-xs">add_course_academia_phase1.sql</code> en Supabase.
        <p className="mt-1 text-xs opacity-80">{error}</p>
      </div>
    );
  }

  if (courses.length === 0) {
    return (
      <p className="py-10 text-center text-muted-foreground">
        Próximamente publicaremos nuevos cursos.
      </p>
    );
  }

  return (
    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {courses.map((course) => (
        <CourseCard key={course.id} course={course} />
      ))}
    </div>
  );
}
