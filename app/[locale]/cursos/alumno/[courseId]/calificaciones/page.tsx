import { AlumnoPageHeader } from '@/components/features/academia/alumno/AlumnoPageHeader';
import { StudentCourseEvaluations } from '@/components/features/academia/courses/StudentCourseEvaluations';

export default async function AlumnoCalificacionesPage({
  params,
}: {
  params: Promise<{ courseId: string }>;
}) {
  const { courseId } = await params;
  return (
    <div>
      <AlumnoPageHeader
        title="Calificaciones"
        description="Consulta tu calificación final y el avance de tus evaluaciones."
      />
      <StudentCourseEvaluations courseId={courseId} section="grades" />
    </div>
  );
}
