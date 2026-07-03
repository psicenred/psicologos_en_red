import { redirect } from 'next/navigation';

export default async function AlumnoContenidoRedirect({
  params,
}: {
  params: Promise<{ courseId: string }>;
}) {
  const { courseId } = await params;
  redirect(`/cursos/alumno/${courseId}/temario`);
}
