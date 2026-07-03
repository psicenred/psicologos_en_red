import { notFound } from 'next/navigation';
import { AlumnoPageHeader } from '@/components/features/academia/alumno/AlumnoPageHeader';
import { AdminAttendanceDashboard } from '@/components/features/academia/admin/AdminAttendanceDashboard';
import { getCourseById } from '@/lib/academia/courses';

export default async function AdminAsistenciaPage({
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
        title="Asistencia"
        description="Consulta la asistencia por sesión y por alumno en cada cohorte del curso."
      />
      <AdminAttendanceDashboard courseId={courseId} isSync={course.format === 'sync'} />
    </div>
  );
}
