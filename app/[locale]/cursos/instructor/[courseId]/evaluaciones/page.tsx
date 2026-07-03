import { AlumnoPageHeader } from '@/components/features/academia/alumno/AlumnoPageHeader';
import { InstructorCourseEvaluations } from '@/components/features/academia/courses/InstructorCourseEvaluations';

export default async function InstructorEvaluacionesPage({
  params,
}: {
  params: Promise<{ courseId: string }>;
}) {
  const { courseId } = await params;
  return (
    <div>
      <AlumnoPageHeader
        title="Evaluaciones"
        description="Crea exámenes y tareas, y consulta el estado de las entregas de tus alumnos."
      />
      <InstructorCourseEvaluations courseId={courseId} section="evaluations" />
    </div>
  );
}
