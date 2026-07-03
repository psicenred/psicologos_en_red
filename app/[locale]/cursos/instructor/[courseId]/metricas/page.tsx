import { AlumnoPageHeader } from '@/components/features/academia/alumno/AlumnoPageHeader';
import { InstructorCourseEvaluations } from '@/components/features/academia/courses/InstructorCourseEvaluations';

export default async function InstructorMetricasPage({
  params,
}: {
  params: Promise<{ courseId: string }>;
}) {
  const { courseId } = await params;
  return (
    <div>
      <AlumnoPageHeader
        title="Métricas del curso"
        description="Indicadores de avance, calificaciones, asistencia y riesgo de abandono."
      />
      <InstructorCourseEvaluations courseId={courseId} section="metrics" />
    </div>
  );
}
