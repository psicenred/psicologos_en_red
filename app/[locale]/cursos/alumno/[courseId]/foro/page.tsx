import { AlumnoPageHeader } from '@/components/features/academia/alumno/AlumnoPageHeader';
import { CourseForumPanel } from '@/components/features/academia/courses/CourseForumPanel';
import { requireAcademiaRole } from '@/lib/academia/auth';
import { getCourseById } from '@/lib/academia/courses';
import { getEnrollment } from '@/lib/academia/enrollments';
import { notFound } from 'next/navigation';

export default async function AlumnoForoPage({
  params,
}: {
  params: Promise<{ courseId: string }>;
}) {
  const { courseId } = await params;
  const session = await requireAcademiaRole('student');

  const course = await getCourseById(courseId);
  if (!course) notFound();

  const enrollment = await getEnrollment(session.userId, courseId);
  if (!enrollment) notFound();

  return (
    <div>
      <AlumnoPageHeader
        title="Foro del curso"
        description="Comparte preguntas y respuestas con tus compañeros de clase."
      />
      <CourseForumPanel courseId={courseId} />
    </div>
  );
}
