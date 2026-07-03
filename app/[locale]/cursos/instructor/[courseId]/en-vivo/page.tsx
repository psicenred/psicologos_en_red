import { AlumnoPageHeader } from '@/components/features/academia/alumno/AlumnoPageHeader';
import { InstructorLiveSessionsPanel } from '@/components/features/academia/courses/InstructorLiveSessionsPanel';
import { getCourseById } from '@/lib/academia/courses';

export default async function InstructorEnVivoPage({
  params,
}: {
  params: Promise<{ courseId: string }>;
}) {
  const { courseId } = await params;
  const course = await getCourseById(courseId);
  if (!course) return null;

  return (
    <div>
      <AlumnoPageHeader
        title="Sesiones en vivo"
        description="Programa clases, pasa lista de asistencia y gestiona grabaciones de tu cohorte."
      />
      <InstructorLiveSessionsPanel courseId={courseId} format={course.format} showWhenEmpty />
    </div>
  );
}
