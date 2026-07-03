import { AlumnoPageHeader } from '@/components/features/academia/alumno/AlumnoPageHeader';
import { StudentCourseEvaluations } from '@/components/features/academia/courses/StudentCourseEvaluations';

export default async function AlumnoExamenesPage({
  params,
}: {
  params: Promise<{ courseId: string }>;
}) {
  const { courseId } = await params;
  return (
    <div>
      <AlumnoPageHeader
        title="Exámenes"
        description="Realiza tus evaluaciones y revisa el estado de cada examen."
      />
      <StudentCourseEvaluations courseId={courseId} section="exams" />
    </div>
  );
}
