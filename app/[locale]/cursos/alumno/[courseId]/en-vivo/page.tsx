import { notFound } from 'next/navigation';
import { AlumnoPageHeader } from '@/components/features/academia/alumno/AlumnoPageHeader';
import { CourseLiveSessionsPanel } from '@/components/features/academia/courses/CourseLiveSessionsPanel';
import { getCourseById } from '@/lib/academia/courses';

export default async function AlumnoEnVivoPage({
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
        title="Sesiones en vivo"
        description="Únete a las clases programadas o revisa las grabaciones disponibles."
      />
      <CourseLiveSessionsPanel courseId={courseId} format={course.format} showWhenEmpty />
    </div>
  );
}
