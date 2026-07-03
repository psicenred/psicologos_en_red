import { AlumnoPageHeader } from '@/components/features/academia/alumno/AlumnoPageHeader';
import { SubmissionReviewWorkspace } from '@/components/features/academia/courses/SubmissionReviewWorkspace';

export default async function InstructorEntregasPage({
  params,
  searchParams,
}: {
  params: Promise<{ courseId: string }>;
  searchParams: Promise<{ submission?: string }>;
}) {
  const { courseId } = await params;
  const { submission } = await searchParams;

  return (
    <div>
      <AlumnoPageHeader
        title="Revisar entregas"
        description="Consulta el PDF de cada tarea o las respuestas de cada examen, califica y libera la nota al alumno."
      />
      <SubmissionReviewWorkspace
        courseId={courseId}
        initialSubmissionId={submission ?? null}
      />
    </div>
  );
}
