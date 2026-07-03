import { CourseTemarioPanel } from '@/components/features/academia/courses/CourseTemarioPanel';

export default async function InstructorCourseTemarioPage({
  params,
}: {
  params: Promise<{ courseId: string }>;
}) {
  const { courseId } = await params;

  return (
    <CourseTemarioPanel
      courseId={courseId}
      mode="student"
      title="Temario"
      description="Vista de consulta del plan de estudios. El material y el temario los edita el administrador."
    />
  );
}
