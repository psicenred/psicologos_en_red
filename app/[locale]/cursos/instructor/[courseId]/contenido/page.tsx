import { redirect } from 'next/navigation';

export default async function InstructorContenidoRedirect({
  params,
}: {
  params: Promise<{ courseId: string }>;
}) {
  const { courseId } = await params;
  redirect(`/cursos/instructor/${courseId}`);
}
