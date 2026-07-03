import { redirect } from 'next/navigation';

export default async function AdminContenidoRedirect({
  params,
}: {
  params: Promise<{ courseId: string }>;
}) {
  const { courseId } = await params;
  redirect(`/cursos/admin/${courseId}/temario`);
}
