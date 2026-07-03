import { notFound } from 'next/navigation';
import { AlumnoPageHeader } from '@/components/features/academia/alumno/AlumnoPageHeader';
import { AdminCohortsPanel } from '@/components/features/academia/courses/AdminCohortsPanel';
import { getCourseById } from '@/lib/academia/courses';

export default async function AdminCohortesPage({
  params,
}: {
  params: Promise<{ courseId: string }>;
}) {
  const { courseId } = await params;
  const course = await getCourseById(courseId);
  if (!course) notFound();

  return (
    <div>
      <AlumnoPageHeader
        title="Cohortes"
        description="Programa fechas de cohortes y sesiones en vivo para cursos síncronos."
      />
      <AdminCohortsPanel courseId={courseId} isSync={course.format === 'sync'} />
    </div>
  );
}
