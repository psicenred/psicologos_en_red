import { AlumnoPageHeader } from '@/components/features/academia/alumno/AlumnoPageHeader';
import { StudentCourseEvaluations } from '@/components/features/academia/courses/StudentCourseEvaluations';

export default async function AlumnoTareasPage({
  params,
}: {
  params: Promise<{ courseId: string }>;
}) {
  const { courseId } = await params;
  return (
    <div>
      <AlumnoPageHeader
        title="Tareas"
        description="Consulta las entregas pendientes y el estado de tus tareas."
      />
      <StudentCourseEvaluations courseId={courseId} section="assignments" />
    </div>
  );
}
