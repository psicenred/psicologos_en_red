import { CurriculumEditor } from '@/components/features/academia/admin/CurriculumEditor';

export default async function AdminTemarioPage({
  params,
}: {
  params: Promise<{ courseId: string }>;
}) {
  const { courseId } = await params;
  return <CurriculumEditor courseId={courseId} />;
}
